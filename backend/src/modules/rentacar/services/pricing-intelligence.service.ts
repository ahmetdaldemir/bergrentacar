import { Repository, Between, LessThanOrEqual, MoreThanOrEqual, In } from 'typeorm';
import { AppDataSource } from '../../../config/data-source';
import { PricingInsightRule } from '../entities/pricing-insight-rule.entity';
import { PricingInsight, InsightType, InsightSeverity, InsightStatus } from '../entities/pricing-insight.entity';
import { OccupancyAnalytics } from '../entities/occupancy-analytics.entity';
import { Vehicle } from '../entities/vehicle.entity';
import { Reservation, ReservationStatus, ReservationType } from '../../shared/entities/reservation.entity';
import { LocationVehiclePricing } from '../entities/location-vehicle-pricing.entity';

export interface PricingIntelligenceResult {
  insights: PricingInsight[];
  summary: {
    totalInsights: number;
    byType: Record<InsightType, number>;
    bySeverity: Record<InsightSeverity, number>;
  };
}

export class PricingIntelligenceService {
  private static ruleRepo(): Repository<PricingInsightRule> {
    return AppDataSource.getRepository(PricingInsightRule);
  }

  private static insightRepo(): Repository<PricingInsight> {
    return AppDataSource.getRepository(PricingInsight);
  }

  private static analyticsRepo(): Repository<OccupancyAnalytics> {
    return AppDataSource.getRepository(OccupancyAnalytics);
  }

  private static vehicleRepo(): Repository<Vehicle> {
    return AppDataSource.getRepository(Vehicle);
  }

  private static reservationRepo(): Repository<Reservation> {
    return AppDataSource.getRepository(Reservation);
  }

  private static pricingRepo(): Repository<LocationVehiclePricing> {
    return AppDataSource.getRepository(LocationVehiclePricing);
  }

  /**
   * Get or create default rule for tenant
   */
  static async getDefaultRule(tenantId: string): Promise<PricingInsightRule> {
    let rule = await this.ruleRepo().findOne({
      where: { tenantId, isDefault: true, isActive: true },
    });

    if (!rule) {
      rule = this.ruleRepo().create({
        tenantId,
        name: 'Default Pricing Intelligence Rules',
        description: 'Default thresholds for pricing and occupancy analysis',
        minOccupancyRate: 0,
        lowOccupancyThreshold: 30,
        highOccupancyThreshold: 80,
        priceDeviationThreshold: 20,
        underpriceThreshold: 15,
        overpriceThreshold: 30,
        idleDaysThreshold: 30,
        idleOccupancyThreshold: 10,
        seasonalAnalysisEnabled: true,
        seasonalTrendPeriods: 12,
        locationAnalysisEnabled: true,
        locationDemandThreshold: 70,
        analysisPeriodDays: 90,
        isActive: true,
        isDefault: true,
      });
      rule = await this.ruleRepo().save(rule);
    }

    return rule;
  }

  /**
   * Analyze all vehicles and generate insights
   */
  static async analyzeTenant(tenantId: string): Promise<PricingIntelligenceResult> {
    const rule = await this.getDefaultRule(tenantId);
    const vehicles = await this.vehicleRepo().find({
      where: { tenantId, isActive: true },
    });

    const insights: PricingInsight[] = [];

    // Analyze each vehicle
    for (const vehicle of vehicles) {
      const vehicleInsights = await this.analyzeVehicle(tenantId, vehicle.id, rule);
      insights.push(...vehicleInsights);
    }

    // Generate location-based insights
    if (rule.locationAnalysisEnabled) {
      const locationInsights = await this.analyzeLocations(tenantId, rule);
      insights.push(...locationInsights);
    }

    // Save insights
    if (insights.length > 0) {
      // Mark old insights as resolved
      await this.insightRepo().update(
        { tenantId, status: InsightStatus.ACTIVE },
        { status: InsightStatus.RESOLVED, resolvedAt: new Date() }
      );

      // Save new insights
      await this.insightRepo().save(insights);
    }

    // Calculate summary
    const summary = {
      totalInsights: insights.length,
      byType: {} as Record<InsightType, number>,
      bySeverity: {} as Record<InsightSeverity, number>,
    };

    insights.forEach(insight => {
      summary.byType[insight.type] = (summary.byType[insight.type] || 0) + 1;
      summary.bySeverity[insight.severity] = (summary.bySeverity[insight.severity] || 0) + 1;
    });

    return { insights, summary };
  }

  /**
   * Analyze a single vehicle
   */
  private static async analyzeVehicle(
    tenantId: string,
    vehicleId: string,
    rule: PricingInsightRule
  ): Promise<PricingInsight[]> {
    const insights: PricingInsight[] = [];

    // Get analysis period
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - rule.analysisPeriodDays);

    // Get reservations for this vehicle
    const reservations = await this.reservationRepo().find({
      where: {
        tenantId,
        type: ReservationType.RENTACAR,
        status: In([ReservationStatus.CONFIRMED, ReservationStatus.COMPLETED]),
        checkOut: MoreThanOrEqual(startDate),
      },
    });

    // Filter by vehicleId from metadata
    const vehicleReservations = reservations.filter(r => {
      const metadata = r.metadata as any;
      return metadata?.vehicleId === vehicleId;
    });

    // Calculate occupancy
    const occupancy = await this.calculateOccupancy(tenantId, vehicleId, startDate, endDate, vehicleReservations);

    // Check for idle vehicle
    if (occupancy.occupancyRate < rule.idleOccupancyThreshold && occupancy.idleDays >= rule.idleDaysThreshold) {
      insights.push(this.createIdleVehicleInsight(tenantId, vehicleId, occupancy, rule));
    }

    // Get current pricing
    const currentPricing = await this.getCurrentPricing(tenantId, vehicleId);
    if (currentPricing) {
      // Get market average
      const marketAverage = await this.getMarketAveragePrice(tenantId, vehicleId, startDate, endDate);

      if (marketAverage && currentPricing.price) {
        const priceDiff = ((currentPricing.price - marketAverage) / marketAverage) * 100;

        // Check for underpricing
        if (priceDiff < -rule.underpriceThreshold && occupancy.occupancyRate > rule.highOccupancyThreshold) {
          insights.push(this.createUnderpricedInsight(tenantId, vehicleId, currentPricing.price, marketAverage, occupancy, rule));
        }

        // Check for overpricing
        if (priceDiff > rule.overpriceThreshold && occupancy.occupancyRate < rule.lowOccupancyThreshold) {
          insights.push(this.createOverpricedInsight(tenantId, vehicleId, currentPricing.price, marketAverage, occupancy, rule));
        }
      }
    }

    // Check for high demand periods
    if (occupancy.occupancyRate > rule.highOccupancyThreshold) {
      const highDemandDates = await this.identifyHighDemandDates(tenantId, vehicleId, rule);
      if (highDemandDates.length > 0) {
        insights.push(this.createHighDemandInsight(tenantId, vehicleId, highDemandDates, occupancy, rule));
      }
    }

    // Seasonal trend analysis
    if (rule.seasonalAnalysisEnabled) {
      const seasonalInsight = await this.analyzeSeasonalTrends(tenantId, vehicleId, rule);
      if (seasonalInsight) {
        insights.push(seasonalInsight);
      }
    }

    return insights;
  }

  /**
   * Calculate vehicle occupancy
   */
  private static async calculateOccupancy(
    tenantId: string,
    vehicleId: string,
    startDate: Date,
    endDate: Date,
    reservations: Reservation[]
  ): Promise<{
    occupancyRate: number;
    bookedDays: number;
    totalDays: number;
    idleDays: number;
    averagePrice: number;
  }> {
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate booked days from reservations
    let bookedDays = 0;
    let totalRevenue = 0;
    const bookedDates = new Set<string>();

    reservations.forEach(reservation => {
      const checkout = reservation.checkOut ? new Date(reservation.checkOut) : null;
      const checkin = reservation.checkIn ? new Date(reservation.checkIn) : null;
      
      if (checkout && checkin) {
        const days = Math.ceil((checkin.getTime() - checkout.getTime()) / (1000 * 60 * 60 * 24));
        bookedDays += days;

        // Track booked dates
        for (let d = new Date(checkout); d <= checkin; d.setDate(d.getDate() + 1)) {
          bookedDates.add(d.toISOString().split('T')[0]);
        }

        // Get revenue from metadata
        const metadata = reservation.metadata as any;
        if (metadata?.totalPrice) {
          totalRevenue += Number(metadata.totalPrice) || 0;
        }
      }
    });

    const occupancyRate = totalDays > 0 ? (bookedDays / totalDays) * 100 : 0;
    const idleDays = totalDays - bookedDays;
    const averagePrice = reservations.length > 0 ? totalRevenue / reservations.length : 0;

    return {
      occupancyRate: Math.min(100, Math.max(0, occupancyRate)),
      bookedDays,
      totalDays,
      idleDays,
      averagePrice,
    };
  }

  /**
   * Get current pricing for vehicle
   */
  private static async getCurrentPricing(tenantId: string, vehicleId: string): Promise<{ price: number; locationId?: string } | null> {
    const now = new Date();
    const month = now.getMonth() + 1;

    // Try to get location-based pricing
    const pricing = await this.pricingRepo().findOne({
      where: {
        vehicleId,
        month,
        isActive: true,
      },
      order: { createdAt: 'DESC' },
    });

    if (pricing) {
      return {
        price: Number(pricing.price),
        locationId: pricing.locationId,
      };
    }

    // Fallback to vehicle base rate
    const vehicle = await this.vehicleRepo().findOne({ where: { id: vehicleId } });
    if (vehicle && vehicle.baseRate) {
      return {
        price: Number(vehicle.baseRate),
      };
    }

    return null;
  }

  /**
   * Get market average price for similar vehicles
   */
  private static async getMarketAveragePrice(
    tenantId: string,
    vehicleId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number | null> {
    const vehicle = await this.vehicleRepo().findOne({ where: { id: vehicleId } });
    if (!vehicle) return null;

    // Get similar vehicles (same category or similar base rate)
    const similarVehicles = await this.vehicleRepo().find({
      where: {
        tenantId,
        isActive: true,
        ...(vehicle.categoryId ? { categoryId: vehicle.categoryId } : {}),
      },
    });

    if (similarVehicles.length === 0) return null;

    // Get average price from reservations
    const reservations = await this.reservationRepo().find({
      where: {
        tenantId,
        type: ReservationType.RENTACAR,
        status: In([ReservationStatus.CONFIRMED, ReservationStatus.COMPLETED]),
        checkOut: Between(startDate, endDate),
      },
    });

    const prices: number[] = [];
    reservations.forEach(reservation => {
      const metadata = reservation.metadata as any;
      if (metadata?.dailyPrice) {
        prices.push(Number(metadata.dailyPrice));
      }
    });

    if (prices.length === 0) {
      // Fallback to base rates
      const baseRates = similarVehicles
        .map(v => v.baseRate)
        .filter(r => r && Number(r) > 0)
        .map(r => Number(r));
      
      if (baseRates.length > 0) {
        return baseRates.reduce((a, b) => a + b, 0) / baseRates.length;
      }
      return null;
    }

    return prices.reduce((a, b) => a + b, 0) / prices.length;
  }

  /**
   * Create idle vehicle insight
   */
  private static createIdleVehicleInsight(
    tenantId: string,
    vehicleId: string,
    occupancy: { occupancyRate: number; idleDays: number },
    rule: PricingInsightRule
  ): PricingInsight {
    const severity = occupancy.idleDays >= rule.idleDaysThreshold * 2 ? InsightSeverity.CRITICAL : InsightSeverity.WARNING;

    return this.insightRepo().create({
      tenantId,
      vehicleId,
      type: InsightType.IDLE_VEHICLE,
      severity,
      status: InsightStatus.ACTIVE,
      title: `Vehicle Idle for ${occupancy.idleDays} Days`,
      reasoning: `This vehicle has been idle for ${occupancy.idleDays} days with only ${occupancy.occupancyRate.toFixed(1)}% occupancy rate. Consider promotional pricing, relocation to a higher-demand location, or temporary removal from inventory.`,
      occupancyRate: occupancy.occupancyRate,
      idleDays: occupancy.idleDays,
      analysisStartDate: new Date(Date.now() - rule.analysisPeriodDays * 24 * 60 * 60 * 1000),
      analysisEndDate: new Date(),
    });
  }

  /**
   * Create underpriced insight
   */
  private static createUnderpricedInsight(
    tenantId: string,
    vehicleId: string,
    currentPrice: number,
    marketAverage: number,
    occupancy: { occupancyRate: number },
    rule: PricingInsightRule
  ): PricingInsight {
    const priceDiff = ((marketAverage - currentPrice) / marketAverage) * 100;
    const recommendedPrice = marketAverage * 0.95; // 5% below market average
    const severity = priceDiff > rule.underpriceThreshold * 2 ? InsightSeverity.CRITICAL : InsightSeverity.WARNING;

    return this.insightRepo().create({
      tenantId,
      vehicleId,
      type: InsightType.UNDERPRICED,
      severity,
      status: InsightStatus.ACTIVE,
      title: 'Vehicle Underpriced',
      reasoning: `Current price (${currentPrice.toFixed(2)}) is ${priceDiff.toFixed(1)}% below market average (${marketAverage.toFixed(2)}). With ${occupancy.occupancyRate.toFixed(1)}% occupancy, there's room to increase pricing. Recommended price: ${recommendedPrice.toFixed(2)}.`,
      currentPrice,
      recommendedPrice,
      marketAveragePrice: marketAverage,
      occupancyRate: occupancy.occupancyRate,
      analysisStartDate: new Date(Date.now() - rule.analysisPeriodDays * 24 * 60 * 60 * 1000),
      analysisEndDate: new Date(),
    });
  }

  /**
   * Create overpriced insight
   */
  private static createOverpricedInsight(
    tenantId: string,
    vehicleId: string,
    currentPrice: number,
    marketAverage: number,
    occupancy: { occupancyRate: number },
    rule: PricingInsightRule
  ): PricingInsight {
    const priceDiff = ((currentPrice - marketAverage) / marketAverage) * 100;
    const recommendedPrice = marketAverage * 1.05; // 5% above market average
    const severity = priceDiff > rule.overpriceThreshold * 2 ? InsightSeverity.CRITICAL : InsightSeverity.WARNING;

    return this.insightRepo().create({
      tenantId,
      vehicleId,
      type: InsightType.OVERPRICED,
      severity,
      status: InsightStatus.ACTIVE,
      title: 'Vehicle Overpriced',
      reasoning: `Current price (${currentPrice.toFixed(2)}) is ${priceDiff.toFixed(1)}% above market average (${marketAverage.toFixed(2)}). Low occupancy (${occupancy.occupancyRate.toFixed(1)}%) suggests price may be too high. Recommended price: ${recommendedPrice.toFixed(2)}.`,
      currentPrice,
      recommendedPrice,
      marketAveragePrice: marketAverage,
      occupancyRate: occupancy.occupancyRate,
      analysisStartDate: new Date(Date.now() - rule.analysisPeriodDays * 24 * 60 * 60 * 1000),
      analysisEndDate: new Date(),
    });
  }

  /**
   * Identify high demand dates
   */
  private static async identifyHighDemandDates(
    tenantId: string,
    vehicleId: string,
    rule: PricingInsightRule
  ): Promise<Array<{ date: string; expectedDemand: number; recommendedPrice?: number; reason: string }>> {
    // Analyze next 30 days
    const dates: Array<{ date: string; expectedDemand: number; recommendedPrice?: number; reason: string }> = [];
    const today = new Date();

    for (let i = 1; i <= 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      // Get historical data for this date
      const historical = await this.analyticsRepo().find({
        where: {
          tenantId,
          vehicleId,
          date: date,
        },
      });

      if (historical.length > 0) {
        const avgOccupancy = historical.reduce((sum, h) => sum + Number(h.occupancyRate), 0) / historical.length;
        if (avgOccupancy > rule.highOccupancyThreshold) {
          dates.push({
            date: dateStr,
            expectedDemand: avgOccupancy,
            reason: `Historical data shows ${avgOccupancy.toFixed(1)}% average occupancy on this date`,
          });
        }
      }
    }

    return dates;
  }

  /**
   * Create high demand insight
   */
  private static createHighDemandInsight(
    tenantId: string,
    vehicleId: string,
    highDemandDates: Array<{ date: string; expectedDemand: number; reason: string }>,
    occupancy: { occupancyRate: number },
    rule: PricingInsightRule
  ): PricingInsight {
    return this.insightRepo().create({
      tenantId,
      vehicleId,
      type: InsightType.HIGH_DEMAND,
      severity: InsightSeverity.INFO,
      status: InsightStatus.ACTIVE,
      title: 'High Demand Periods Detected',
      reasoning: `Vehicle shows ${occupancy.occupancyRate.toFixed(1)}% occupancy with ${highDemandDates.length} high-demand dates identified in the next 30 days. Consider dynamic pricing for these periods.`,
      occupancyRate: occupancy.occupancyRate,
      suggestedDates: highDemandDates,
      demandScore: occupancy.occupancyRate,
      analysisStartDate: new Date(),
      analysisEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
  }

  /**
   * Analyze seasonal trends
   */
  private static async analyzeSeasonalTrends(
    tenantId: string,
    vehicleId: string,
    rule: PricingInsightRule
  ): Promise<PricingInsight | null> {
    // Get historical analytics for seasonal analysis
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - rule.seasonalTrendPeriods);

    const analytics = await this.analyticsRepo().find({
      where: {
        tenantId,
        vehicleId,
        date: Between(startDate, endDate),
      },
      order: { date: 'ASC' },
    });

    if (analytics.length < 3) return null;

    // Group by month
    const monthlyData: Record<number, { occupancy: number[]; price: number[] }> = {};
    analytics.forEach(a => {
      const month = a.month || new Date(a.date).getMonth() + 1;
      if (!monthlyData[month]) {
        monthlyData[month] = { occupancy: [], price: [] };
      }
      monthlyData[month].occupancy.push(Number(a.occupancyRate));
      monthlyData[month].price.push(Number(a.averageDailyPrice));
    });

    // Find peak months
    const peakMonths = Object.entries(monthlyData)
      .map(([month, data]) => ({
        month: Number(month),
        avgOccupancy: data.occupancy.reduce((a, b) => a + b, 0) / data.occupancy.length,
      }))
      .filter(m => m.avgOccupancy > rule.highOccupancyThreshold)
      .sort((a, b) => b.avgOccupancy - a.avgOccupancy)
      .slice(0, 3);

    if (peakMonths.length === 0) return null;

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const peakMonthNames = peakMonths.map(m => monthNames[m.month - 1]).join(', ');

    return this.insightRepo().create({
      tenantId,
      vehicleId,
      type: InsightType.SEASONAL_TREND,
      severity: InsightSeverity.INFO,
      status: InsightStatus.ACTIVE,
      title: 'Seasonal Demand Pattern Detected',
      reasoning: `Historical data shows peak demand in ${peakMonthNames} with average occupancy above ${rule.highOccupancyThreshold}%. Consider adjusting pricing strategy for these months.`,
      contextData: { peakMonths },
      analysisStartDate: startDate,
      analysisEndDate: endDate,
    });
  }

  /**
   * Analyze locations
   */
  private static async analyzeLocations(
    tenantId: string,
    rule: PricingInsightRule
  ): Promise<PricingInsight[]> {
    // This would analyze location-based demand
    // For now, return empty array
    return [];
  }

  /**
   * List insights for tenant
   */
  static async listInsights(
    tenantId: string,
    filters?: {
      type?: InsightType;
      severity?: InsightSeverity;
      status?: InsightStatus;
      vehicleId?: string;
    }
  ): Promise<PricingInsight[]> {
    const where: any = { tenantId };
    if (filters?.type) where.type = filters.type;
    if (filters?.severity) where.severity = filters.severity;
    if (filters?.status) where.status = filters.status;
    if (filters?.vehicleId) where.vehicleId = filters.vehicleId;

    return this.insightRepo().find({
      where,
      relations: ['vehicle', 'location'],
      order: { severity: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * Acknowledge insight
   */
  static async acknowledgeInsight(
    id: string,
    tenantId: string,
    userId: string
  ): Promise<PricingInsight> {
    const insight = await this.insightRepo().findOne({
      where: { id, tenantId },
    });

    if (!insight) {
      throw new Error('Insight not found');
    }

    insight.status = InsightStatus.ACKNOWLEDGED;
    insight.acknowledgedAt = new Date();
    insight.acknowledgedByUserId = userId;

    return this.insightRepo().save(insight);
  }

  /**
   * Dismiss insight
   */
  static async dismissInsight(
    id: string,
    tenantId: string
  ): Promise<PricingInsight> {
    const insight = await this.insightRepo().findOne({
      where: { id, tenantId },
    });

    if (!insight) {
      throw new Error('Insight not found');
    }

    insight.status = InsightStatus.DISMISSED;

    return this.insightRepo().save(insight);
  }
}

