import {PromotionCode} from '../common/simpleTypes'
import {
    GetPricingFunction,
    GetProductPrice,
    GetPromotionPrices,
    GetStandardPrices,
    PricingMethod
} from './internalTypes'

export function createPricingMethod(promotionCode: string): PricingMethod {
    if (promotionCode == null || promotionCode.trim().length === 0) {
        return {tag: 'Standard'}
    }
    return {tag: 'Promotion', value: {tag: 'PromotionCode', value: promotionCode} as PromotionCode}
}

export function getPricingFunction(
    standardPrices: GetStandardPrices,
    promoPrices: GetPromotionPrices
): GetPricingFunction {
    const getStandardPrice: GetProductPrice = standardPrices()

    const getPromotionPrice = (promotionCode: PromotionCode): GetProductPrice => {
        const tryGetPromo = promoPrices(promotionCode)
        return (productCode) => {
            const promo = tryGetPromo(productCode)
            return promo ?? getStandardPrice(productCode)
        }
    }

    return (pricingMethod) => {
        if (pricingMethod.tag === 'Standard') return getStandardPrice
        return getPromotionPrice(pricingMethod.value)
    }
}
