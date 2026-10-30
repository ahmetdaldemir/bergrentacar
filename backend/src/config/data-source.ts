import { DataSource } from 'typeorm';
import { loadEnv } from './env';
import { Tenant } from '../modules/tenants/entities/tenant.entity';
import { TenantLanguage } from '../modules/tenants/entities/tenant-language.entity';
import { Destination } from '../modules/shared/entities/destination.entity';
import { Translation } from '../modules/shared/entities/translation.entity';
import { Hotel } from '../modules/shared/entities/hotel.entity';
import { Blog } from '../modules/shared/entities/blog.entity';
import { PhoneCountry } from '../modules/shared/entities/phone-country.entity';
import { Country } from '../modules/shared/entities/country.entity';
import { PaymentMethod } from '../modules/shared/entities/payment-method.entity';
import { Reservation } from '../modules/shared/entities/reservation.entity';
import { ReservationTrafficFine } from '../modules/shared/entities/reservation-traffic-fine.entity';
import { ReservationInvoice } from '../modules/shared/entities/reservation-invoice.entity';
import { ReservationInvoiceConfig } from '../modules/shared/entities/reservation-invoice-config.entity';
import { RentalPickup } from '../modules/rentacar/entities/rental-pickup.entity';
import { RentalReturn } from '../modules/rentacar/entities/rental-return.entity';
import { RentalInspectionMedia } from '../modules/rentacar/entities/rental-inspection-media.entity';
import { RentalWarning } from '../modules/rentacar/entities/rental-warning.entity';
import { Operation } from '../modules/shared/entities/operation.entity';
import { Language } from '../modules/shared/entities/language.entity';
import { Tour } from '../modules/tour/entities/tour.entity';
import { TourSession } from '../modules/tour/entities/tour-session.entity';
import { TourFeature } from '../modules/tour/entities/tour-feature.entity';
import { TourInfoItem } from '../modules/tour/entities/tour-info-item.entity';
import { TourImage } from '../modules/tour/entities/tour-image.entity';
import { TourTimeSlot } from '../modules/tour/entities/tour-time-slot.entity';
import { TourPricing } from '../modules/tour/entities/tour-pricing.entity';
import { Vehicle } from '../modules/rentacar/entities/vehicle.entity';
import { VehiclePlate } from '../modules/rentacar/entities/vehicle-plate.entity';
import { VehiclePricingPeriod } from '../modules/rentacar/entities/vehicle-pricing-period.entity';
import { VehicleReservationAssignment } from '../modules/rentacar/entities/vehicle-reservation-assignment.entity';
import { VehicleCategory } from '../modules/rentacar/entities/vehicle-category.entity';
import { VehicleBrand } from '../modules/rentacar/entities/vehicle-brand.entity';
import { VehicleModel } from '../modules/rentacar/entities/vehicle-model.entity';
import { VehicleImage } from '../modules/rentacar/entities/vehicle-image.entity';
import { VehicleDamage } from '../modules/rentacar/entities/vehicle-damage.entity';
import { VehicleMaintenance } from '../modules/rentacar/entities/vehicle-maintenance.entity';
import { VehiclePenalty } from '../modules/rentacar/entities/vehicle-penalty.entity';
import { VehicleTimelineMedia } from '../modules/rentacar/entities/vehicle-timeline-media.entity';
import { VehicleDamageDetection } from '../modules/rentacar/entities/vehicle-damage-detection.entity';
import { Campaign } from '../modules/rentacar/entities/campaign.entity';
import { ContractTemplate } from '../modules/rentacar/entities/contract-template.entity';
import { Contract } from '../modules/rentacar/entities/contract.entity';
import { PricingInsightRule } from '../modules/rentacar/entities/pricing-insight-rule.entity';
import { PricingInsight } from '../modules/rentacar/entities/pricing-insight.entity';
import { OccupancyAnalytics } from '../modules/rentacar/entities/occupancy-analytics.entity';
import { MarketplaceListing } from '../modules/marketplace/entities/marketplace-listing.entity';
import { TenantServiceAgreement } from '../modules/marketplace/entities/tenant-service-agreement.entity';
import { CommissionTransaction } from '../modules/marketplace/entities/commission-transaction.entity';
import { Location } from '../modules/rentacar/entities/location.entity';
import { MasterLocation } from '../modules/shared/entities/master-location.entity';
import { LocationVehiclePricing } from '../modules/rentacar/entities/location-vehicle-pricing.entity';
import { LocationDeliveryPricing } from '../modules/rentacar/entities/location-delivery-pricing.entity';
import { Extra } from '../modules/rentacar/entities/extra.entity';
import { TenantUser } from '../modules/tenants/entities/tenant-user.entity';
import { TenantMessage } from '../modules/tenants/entities/tenant-message.entity';
import { Currency } from '../modules/shared/entities/currency.entity';
import { TenantSettings } from '../modules/shared/entities/tenant-settings.entity';
import { TenantWhatsAppIntegration } from '../modules/shared/entities/tenant-whatsapp-integration.entity';
import { Survey } from '../modules/shared/entities/survey.entity';
import { SurveyQuestion } from '../modules/shared/entities/survey-question.entity';
import { SurveyResponse } from '../modules/shared/entities/survey-response.entity';
import { EmailTemplate } from '../modules/shared/entities/email-template.entity';
import { TransferVehicle } from '../modules/transfer/entities/transfer-vehicle.entity';
import { TransferVehicleImage } from '../modules/transfer/entities/transfer-vehicle-image.entity';
import { TransferRoute } from '../modules/transfer/entities/transfer-route.entity';
import { TransferRoutePoint } from '../modules/transfer/entities/transfer-route-point.entity';
import { TransferPricing } from '../modules/transfer/entities/transfer-pricing.entity';
import { TransferReservation } from '../modules/transfer/entities/transfer-reservation.entity';
import { TransferDriver } from '../modules/transfer/entities/transfer-driver.entity';
import { TransferPopularRoute } from '../modules/transfer/entities/transfer-popular-route.entity';
import { TransferVehicleFeature } from '../modules/transfer/entities/transfer-vehicle-feature.entity';
import { TransferZone } from '../modules/transfer/entities/transfer-zone.entity';
import { TransferZonePrice } from '../modules/transfer/entities/transfer-zone-price.entity';
import { TransferZonePriceGroup } from '../modules/transfer/entities/transfer-zone-price-group.entity';
import { TransferZonePriceItem } from '../modules/transfer/entities/transfer-zone-price-item.entity';
import { TransferRequest } from '../modules/transfer/entities/transfer-request.entity';
import { TransferExtraProduct } from '../modules/transfer/entities/transfer-extra-product.entity';
import { TransferDiscountCode } from '../modules/transfer/entities/transfer-discount-code.entity';
import { TransferDiscountCodeUsage } from '../modules/transfer/entities/transfer-discount-code-usage.entity';
import { ChatRoom } from '../modules/chat/entities/chat-room.entity';
import { ChatMessage } from '../modules/chat/entities/chat-message.entity';
import { ChatParticipant } from '../modules/chat/entities/chat-participant.entity';
import { ChatWidgetToken } from '../modules/chat/entities/chat-widget-token.entity';
import { Customer } from '../modules/shared/entities/customer.entity';
import { CustomerEmail } from '../modules/shared/entities/customer-email.entity';
import { CustomerWallet } from '../modules/shared/entities/customer-wallet.entity';
import { WalletTransaction } from '../modules/shared/entities/wallet-transaction.entity';
import { Coupon } from '../modules/shared/entities/coupon.entity';
import { CouponRedemption } from '../modules/shared/entities/coupon-redemption.entity';
import { ReservationLog } from '../modules/shared/entities/reservation-log.entity';
import { Page } from '../modules/shared/entities/page.entity';
import { FinanceCategory } from '../modules/finance/entities/finance-category.entity';
import { FinanceCari } from '../modules/finance/entities/finance-cari.entity';
import { FinanceTransaction } from '../modules/finance/entities/finance-transaction.entity';
import { FinanceCheck } from '../modules/finance/entities/finance-check.entity';
import { FinanceLoan } from '../modules/finance/entities/finance-loan.entity';
import { FinanceLoanInstallment } from '../modules/finance/entities/finance-loan-installment.entity';
import { OpsTask } from '../modules/ops/entities/ops-task.entity';
import { CrmPageCategory } from '../modules/crm/entities/crm-page-category.entity';
import { CrmPage } from '../modules/crm/entities/crm-page.entity';
import { AdminUser } from '../modules/admin/entities/admin-user.entity';
import { ActivityLog } from '../modules/activity-log/entities/activity-log.entity';
import { TenantStaticTranslation } from '../modules/shared/entities/tenant-static-translation.entity';
import { TenantHotel } from '../modules/hotel-sales/entities/tenant-hotel.entity';
import { HotelRoomType } from '../modules/hotel-sales/entities/hotel-room-type.entity';
import { HotelContract } from '../modules/hotel-sales/entities/hotel-contract.entity';
import { HotelReservation } from '../modules/hotel-sales/entities/hotel-reservation.entity';
import { FlightReservation } from '../modules/flight-sales/entities/flight-reservation.entity';

const env = loadEnv();

/**
 * TypeORM synchronize: entity ile DB şemasını eşitler.
 *
 * UYARI: Çalışan kodun entity’sinde olmayan kolonlar (ör. manuel eklenen `deepl_api_key`)
 * synchronize açıkken SİLİNEBİLİR — özellikle sunucuda eski `dist` çalışıyorsa.
 * Çözüm: güncel backend’i build edip deploy edin VE/VEYA production’da `DB_SYNC=false` kullanıp
 * şema değişikliklerini SQL/migration ile uygulayın (`scripts/add-deepl-api-key-tenant-settings.sql`).
 */
const shouldSynchronize = env.database.synchronize;

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: env.database.host,
  port: env.database.port,
  username: env.database.username,
  password: env.database.password,
  database: env.database.name,
  synchronize: shouldSynchronize,
  logging: env.nodeEnv === 'development',
  // Explicit connection pool settings (TypeORM default is only 10)
  extra: {
    max: 25,
    min: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  },
  entities: [
    Tenant,
    TenantLanguage,
    Destination,
    Translation,
    Hotel,
    Blog,
    PhoneCountry,
    Country,
    PaymentMethod,
    Reservation,
    ReservationTrafficFine,
    ReservationInvoice,
    ReservationInvoiceConfig,
    RentalPickup,
    RentalReturn,
    RentalInspectionMedia,
    RentalWarning,
    Operation,
    Language,
    MasterLocation,
    Tour,
    TourSession,
    TourFeature,
    TourInfoItem,
    TourImage,
    TourTimeSlot,
    TourPricing,
          Vehicle,
          VehiclePlate,
          VehiclePricingPeriod,
          VehicleReservationAssignment,
          VehicleCategory,
          VehicleBrand,
          VehicleModel,
          Location,
          LocationVehiclePricing,
          LocationDeliveryPricing,
          Extra,
          VehicleImage,
          VehicleDamage,
          VehicleMaintenance,
          VehiclePenalty,
          VehicleTimelineMedia,
          VehicleDamageDetection,
          Campaign,
          ContractTemplate,
          Contract,
          PricingInsightRule,
          PricingInsight,
          OccupancyAnalytics,
          MarketplaceListing,
          TenantServiceAgreement,
          CommissionTransaction,
          TenantUser,
          TenantMessage,
          Currency,
          TenantSettings,
          TenantWhatsAppIntegration,
          Customer,
          CustomerEmail,
          CustomerWallet,
          WalletTransaction,
          Coupon,
          CouponRedemption,
          ReservationLog,
          Survey,
          SurveyQuestion,
          SurveyResponse,
          EmailTemplate,
          TransferVehicle,
          TransferVehicleImage,
          TransferRoute,
          TransferRoutePoint,
          TransferPricing,
          TransferReservation,
          TransferDriver,
          TransferPopularRoute,
          TransferVehicleFeature,
          TransferZone,
          TransferZonePrice,
          TransferZonePriceGroup,
          TransferZonePriceItem,
          TransferRequest,
          TransferExtraProduct,
          TransferDiscountCode,
          TransferDiscountCodeUsage,
          ChatRoom,
          ChatMessage,
          ChatParticipant,
          ChatWidgetToken,
          Page,
          FinanceCategory,
          FinanceCari,
          FinanceTransaction,
          FinanceCheck,
          FinanceLoan,
          FinanceLoanInstallment,
          OpsTask,
          CrmPageCategory,
          CrmPage,
          AdminUser,
          ActivityLog,
          TenantStaticTranslation,
          TenantHotel,
          HotelRoomType,
          HotelContract,
          HotelReservation,
          FlightReservation,
  ],
  // Migrations disabled - using TypeORM synchronize instead
  // migrations: ['dist/migrations/*.js'],
});
