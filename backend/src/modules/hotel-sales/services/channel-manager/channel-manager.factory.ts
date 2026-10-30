/**
 * Channel Manager provider factory.
 * Provider eklemek için buraya import ve case eklensin.
 */

import { ChannelManagerProvider } from '../../entities/tenant-hotel.entity';
import { IChannelManagerProvider } from './channel-manager.interface';
import { Beds24Provider } from './beds24.provider';

export function getChannelManagerProvider(provider: ChannelManagerProvider): IChannelManagerProvider {
  switch (provider) {
    case ChannelManagerProvider.BEDS24:
      return Beds24Provider;
    default:
      throw new Error(`Channel manager provider '${provider}' is not implemented yet`);
  }
}
