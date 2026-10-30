import { Request, Response } from 'express';
import Docker from 'dockerode';
import { asyncHandler } from '../../../utils/errors';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Docker instance oluştur (socket üzerinden)
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

export class MonitoringController {
  /**
   * Tüm servislerin durumunu getir
   */
  static getServicesStatus = asyncHandler(async (req: Request, res: Response) => {
    try {
      // Docker container'ları listele
      const containers = await docker.listContainers({ all: true });
      
      const services = containers
        .filter(container => {
          const name = container.Names?.[0]?.replace(/^\//, '') || '';
          return (
            name.includes('saas-tour') || 
            name.includes('global_') ||
            name.includes('rabbitmq') ||
            name.includes('database') ||
            name.includes('postgres')
          );
        })
        .map(container => {
          const name = container.Names?.[0]?.replace(/^\//, '') || '';
          const status = container.Status || 'Unknown';
          const ports = container.Ports
            ?.map(p => `${p.PublicPort || ''}${p.PublicPort && p.PrivatePort ? ':' : ''}${p.PrivatePort || ''}/${p.Type || ''}`)
            .filter(Boolean)
            .join(', ') || '';
          
          return {
            name,
            status,
            ports,
            isRunning: container.State === 'running',
          };
        });

      res.json({
        services,
        total: services.length,
        running: services.filter(s => s.isRunning).length,
      });
    } catch (error: any) {
      console.error('Error getting services status:', error);
      
      // Docker yüklü değilse veya erişilemiyorsa boş liste döndür
      return res.json({
        services: [],
        total: 0,
        running: 0,
        error: 'Docker is not available or not accessible',
      });
    }
  });

  /**
   * Belirli bir servisi başlat
   */
  static startService = asyncHandler(async (req: Request, res: Response) => {
    const { serviceName } = req.params;
    
    try {
      const container = docker.getContainer(serviceName);
      await container.start();
      
      res.json({ 
        message: `Service ${serviceName} started successfully`,
        serviceName 
      });
    } catch (error: any) {
      res.status(500).json({ 
        message: `Failed to start service ${serviceName}`,
        error: error.message 
      });
    }
  });

  /**
   * Belirli bir servisi durdur
   */
  static stopService = asyncHandler(async (req: Request, res: Response) => {
    const { serviceName } = req.params;
    
    try {
      const container = docker.getContainer(serviceName);
      await container.stop();
      
      res.json({ 
        message: `Service ${serviceName} stopped successfully`,
        serviceName 
      });
    } catch (error: any) {
      res.status(500).json({ 
        message: `Failed to stop service ${serviceName}`,
        error: error.message 
      });
    }
  });

  /**
   * Belirli bir servisi yeniden başlat
   */
  static restartService = asyncHandler(async (req: Request, res: Response) => {
    const { serviceName } = req.params;
    
    try {
      const container = docker.getContainer(serviceName);
      await container.restart();
      
      res.json({ 
        message: `Service ${serviceName} restarted successfully`,
        serviceName 
      });
    } catch (error: any) {
      res.status(500).json({ 
        message: `Failed to restart service ${serviceName}`,
        error: error.message 
      });
    }
  });

  /**
   * Servis loglarını getir
   */
  static getServiceLogs = asyncHandler(async (req: Request, res: Response) => {
    const { serviceName } = req.params;
    const lines = req.query.lines ? parseInt(req.query.lines as string) : 100;
    
    try {
      const container = docker.getContainer(serviceName);
      const logs = await container.logs({
        stdout: true,
        stderr: true,
        tail: lines,
        timestamps: false,
      });
      
      res.json({ 
        serviceName,
        logs: logs.toString(),
        lines 
      });
    } catch (error: any) {
      res.status(500).json({ 
        message: `Failed to get logs for ${serviceName}`,
        error: error.message 
      });
    }
  });

  /**
   * Sistem kaynak kullanımını getir
   */
  static getSystemStats = asyncHandler(async (req: Request, res: Response) => {
    try {
      const containers = await docker.listContainers({ all: false });
      
      const statsPromises = containers
        .filter(container => {
          const name = container.Names?.[0]?.replace(/^\//, '') || '';
          return (
            name.includes('saas-tour') || 
            name.includes('global_') ||
            name.includes('rabbitmq') ||
            name.includes('database') ||
            name.includes('postgres')
          );
        })
        .map(async (container) => {
          try {
            const dockerContainer = docker.getContainer(container.Id);
            const stats = await dockerContainer.stats({ stream: false });
            
            // Stats'dan bilgileri parse et
            const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - (stats.precpu_stats?.cpu_usage?.total_usage || 0);
            const systemDelta = stats.cpu_stats.system_cpu_usage - (stats.precpu_stats?.system_cpu_usage || 0);
            const cpuPercent = systemDelta > 0 ? ((cpuDelta / systemDelta) * 100).toFixed(2) : '0.00';
            
            const memUsage = stats.memory_stats.usage || 0;
            const memLimit = stats.memory_stats.limit || 1;
            const memPercent = ((memUsage / memLimit) * 100).toFixed(2);
            const memUsageMB = (memUsage / 1024 / 1024).toFixed(2);
            const memLimitMB = (memLimit / 1024 / 1024).toFixed(2);
            
            const name = container.Names?.[0]?.replace(/^\//, '') || 'Unknown';
            
            const networkRx = stats.networks ? Object.values(stats.networks).reduce((acc: number, net: any) => acc + (net.rx_bytes || 0), 0) : 0;
            const networkTx = stats.networks ? Object.values(stats.networks).reduce((acc: number, net: any) => acc + (net.tx_bytes || 0), 0) : 0;
            
            const blockRead = stats.blkio_stats?.io_service_bytes_recursive?.find((s: any) => s.op === 'Read')?.value || 0;
            const blockWrite = stats.blkio_stats?.io_service_bytes_recursive?.find((s: any) => s.op === 'Write')?.value || 0;
            
            return {
              name,
              cpu: `${cpuPercent}%`,
              memoryUsage: `${memUsageMB}MB / ${memLimitMB}MB`,
              memoryPercent: `${memPercent}%`,
              networkIO: `${(networkRx / 1024 / 1024).toFixed(2)}MB / ${(networkTx / 1024 / 1024).toFixed(2)}MB`,
              blockIO: `${(blockRead / 1024 / 1024).toFixed(2)}MB / ${(blockWrite / 1024 / 1024).toFixed(2)}MB`,
            };
          } catch (err) {
            console.error(`Error getting stats for container ${container.Id}:`, err);
            return null;
          }
        });

      const statsResults = await Promise.all(statsPromises);
      const stats = statsResults.filter(Boolean);

      res.json({ stats });
    } catch (error: any) {
      console.error('Error getting system stats:', error);
      
      // Docker yüklü değilse veya erişilemiyorsa boş liste döndür
      return res.json({ 
        stats: [],
        error: 'Docker is not available or not accessible',
      });
    }
  });
}

