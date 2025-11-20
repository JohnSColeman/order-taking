import test from 'node:test'
import assert from 'node:assert/strict'

import {createPricingMethod, getPricingFunction} from '../placeOrder/pricing'
import {
    createUnitQuantity,
    createKilogramQuantity,
    createPrice,
    multiplyPrice,
    unsafeCreatePrice,
    createWidgetCode,
    createGizmoCode
} from '../common/simpleTypes'
import {throwOnLeft} from '../fp'

// ============================================================================
// Tests for createPricingMethod
// ============================================================================

test('createPricingMethod returns Standard when promotion code is null', () => {
    const result = createPricingMethod(null as any)
    assert.equal(result.tag, 'Standard')
})

test('createPricingMethod returns Standard when promotion code is empty string', () => {
    const result = createPricingMethod('')
    assert.equal(result.tag, 'Standard')
})

test('createPricingMethod returns Standard when promotion code is whitespace only', () => {
    const result = createPricingMethod('   ')
    assert.equal(result.tag, 'Standard')
})

test('createPricingMethod returns Promotion when valid promotion code provided', () => {
    const result = createPricingMethod('SUMMER2024')
    assert.equal(result.tag, 'Promotion')
    if (result.tag === 'Promotion') {
        assert.equal(result.value.value, 'SUMMER2024')
    }
})

// ============================================================================
// Tests for getPricingFunction
// ============================================================================

test('getPricingFunction returns standard pricing when method is Standard', () => {
    const standardPrice = unsafeCreatePrice(100)
    const getStandardPrices = () => (_: any) => standardPrice
    const getPromotionPrices = (_: any) => (_: any) => null
    
    const getPricingFunc = getPricingFunction(getStandardPrices, getPromotionPrices)
    const priceFunc = getPricingFunc({tag: 'Standard'})
    
    const productCode = createWidgetCode('ProductCode', 'W1234').caseOf({
        Right: (code) => ({tag: 'Widget' as const, value: code}),
        Left: throwOnLeft
    })
    
    const price = priceFunc(productCode)
    assert.equal(price.value, standardPrice.value)
})

test('getPricingFunction returns standard price as fallback when promotion has no price', () => {
    const standardPrice = unsafeCreatePrice(100)
    const getStandardPrices = () => (_: any) => standardPrice
    const getPromotionPrices = (_: any) => (_: any) => null // No promo price available
    
    const getPricingFunc = getPricingFunction(getStandardPrices, getPromotionPrices)
    const promotionCode = {tag: 'PromotionCode' as const, value: 'PROMO123'}
    const priceFunc = getPricingFunc({tag: 'Promotion', value: promotionCode})
    
    const productCode = createWidgetCode('ProductCode', 'W1234').caseOf({
        Right: (code) => ({tag: 'Widget' as const, value: code}),
        Left: throwOnLeft
    })
    
    const price = priceFunc(productCode)
    assert.equal(price.value, standardPrice.value)
})

test('getPricingFunction returns promotion price when available', () => {
    const standardPrice = unsafeCreatePrice(100)
    const promoPrice = unsafeCreatePrice(75)
    
    const getStandardPrices = () => (_: any) => standardPrice
    const getPromotionPrices = (_: any) => (productCode: any) => {
        // Only provide promo price for specific product
        if (productCode.tag === 'Widget' && productCode.value.value === 'W1234') {
            return promoPrice
        }
        return null
    }
    
    const getPricingFunc = getPricingFunction(getStandardPrices, getPromotionPrices)
    const promotionCode = {tag: 'PromotionCode' as const, value: 'PROMO123'}
    const priceFunc = getPricingFunc({tag: 'Promotion', value: promotionCode})
    
    const productCode = createWidgetCode('ProductCode', 'W1234').caseOf({
        Right: (code) => ({tag: 'Widget' as const, value: code}),
        Left: throwOnLeft
    })
    
    const price = priceFunc(productCode)
    assert.equal(price.value, promoPrice.value)
})

test('getPricingFunction correctly chains pricing lookup for different products', () => {
    const standardPrice = unsafeCreatePrice(100)
    const promoPrice = unsafeCreatePrice(75)
    
    const getStandardPrices = () => (_: any) => standardPrice
    const getPromotionPrices = (_: any) => (productCode: any) => {
        // Only W1234 has promo price
        if (productCode.tag === 'Widget' && productCode.value.value === 'W1234') {
            return promoPrice
        }
        return null
    }
    
    const getPricingFunc = getPricingFunction(getStandardPrices, getPromotionPrices)
    const promotionCode = {tag: 'PromotionCode' as const, value: 'PROMO123'}
    const priceFunc = getPricingFunc({tag: 'Promotion', value: promotionCode})
    
    // Product with promo
    const productWithPromo = createWidgetCode('ProductCode', 'W1234').caseOf({
        Right: (code) => ({tag: 'Widget' as const, value: code}),
        Left: throwOnLeft
    })
    const priceWithPromo = priceFunc(productWithPromo)
    assert.equal(priceWithPromo.value, promoPrice.value)
    
    // Product without promo (should fall back to standard)
    const productWithoutPromo = createWidgetCode('ProductCode', 'W5678').caseOf({
        Right: (code) => ({tag: 'Widget' as const, value: code}),
        Left: throwOnLeft
    })
    const priceWithoutPromo = priceFunc(productWithoutPromo)
    assert.equal(priceWithoutPromo.value, standardPrice.value)
})

// ============================================================================
// Tests for multiplyPrice (arithmetic verification)
// ============================================================================

test('multiplyPrice correctly multiplies unit quantities', () => {
    const quantity = createUnitQuantity('Quantity', 5).caseOf({
        Right: (q) => ({tag: 'Unit' as const, value: q}),
        Left: throwOnLeft
    })
    const price = unsafeCreatePrice(10.50)
    
    const result = multiplyPrice(quantity, price)
    
    assert.equal(result.isRight(), true)
    const totalPrice = result.caseOf({
        Right: (p) => p,
        Left: throwOnLeft
    })
    
    // 5 * 10.50 = 52.50
    assert.equal(totalPrice.value, 52500n) // 52.50 in fixed-3 format
})

test('multiplyPrice correctly multiplies kilogram quantities', () => {
    const quantity = createKilogramQuantity('Quantity', 2.5).caseOf({
        Right: (q) => ({tag: 'Kilogram' as const, value: q}),
        Left: throwOnLeft
    })
    const price = unsafeCreatePrice(20.00)
    
    const result = multiplyPrice(quantity, price)
    
    assert.equal(result.isRight(), true)
    const totalPrice = result.caseOf({
        Right: (p) => p,
        Left: throwOnLeft
    })
    
    // 2.5 kg * 20.00 = 50.00
    assert.equal(totalPrice.value, 50000n) // 50.00 in fixed-3 format
})

test('multiplyPrice handles minimum unit quantity correctly', () => {
    const quantity = createUnitQuantity('Quantity', 1).caseOf({
        Right: (q) => ({tag: 'Unit' as const, value: q}),
        Left: throwOnLeft
    })
    const price = unsafeCreatePrice(0.99)
    
    const result = multiplyPrice(quantity, price)
    
    assert.equal(result.isRight(), true)
    const totalPrice = result.caseOf({
        Right: (p) => p,
        Left: throwOnLeft
    })
    
    // 1 * 0.99 = 0.99
    assert.equal(totalPrice.value, 990n) // 0.99 in fixed-3 format
})

test('multiplyPrice handles maximum unit quantity correctly', () => {
    const quantity = createUnitQuantity('Quantity', 1000).caseOf({
        Right: (q) => ({tag: 'Unit' as const, value: q}),
        Left: throwOnLeft
    })
    const price = unsafeCreatePrice(0.50)
    
    const result = multiplyPrice(quantity, price)
    
    assert.equal(result.isRight(), true)
    const totalPrice = result.caseOf({
        Right: (p) => p,
        Left: throwOnLeft
    })
    
    // 1000 * 0.50 = 500.00
    assert.equal(totalPrice.value, 500000n) // 500.00 in fixed-3 format
})

test('multiplyPrice handles minimum kilogram quantity correctly', () => {
    const quantity = createKilogramQuantity('Quantity', 0.05).caseOf({
        Right: (q) => ({tag: 'Kilogram' as const, value: q}),
        Left: throwOnLeft
    })
    const price = unsafeCreatePrice(100.00)
    
    const result = multiplyPrice(quantity, price)
    
    assert.equal(result.isRight(), true)
    const totalPrice = result.caseOf({
        Right: (p) => p,
        Left: throwOnLeft
    })
    
    // 0.05 kg * 100.00 = 5.00
    assert.equal(totalPrice.value, 5000n) // 5.00 in fixed-3 format
})

test('multiplyPrice handles fractional kilogram quantities with precision', () => {
    const quantity = createKilogramQuantity('Quantity', 3.333).caseOf({
        Right: (q) => ({tag: 'Kilogram' as const, value: q}),
        Left: throwOnLeft
    })
    const price = unsafeCreatePrice(15.00)
    
    const result = multiplyPrice(quantity, price)
    
    assert.equal(result.isRight(), true)
    const totalPrice = result.caseOf({
        Right: (p) => p,
        Left: throwOnLeft
    })
    
    // 3.333 kg * 15.00 = 49.995 ≈ 49.995
    // In fixed-3: 3333 * 15000 / 1000 = 49995
    assert.equal(totalPrice.value, 49995n)
})

test('multiplyPrice returns error when result exceeds maximum price', () => {
    const quantity = createUnitQuantity('Quantity', 1000).caseOf({
        Right: (q) => ({tag: 'Unit' as const, value: q}),
        Left: throwOnLeft
    })
    const price = unsafeCreatePrice(999.99) // Max is 1000.00
    
    const result = multiplyPrice(quantity, price)
    
    // 1000 * 999.99 = 999,990.00 which exceeds the max of 1000.00
    assert.equal(result.isLeft(), true)
})

test('multiplyPrice preserves decimal precision for small values', () => {
    const quantity = createKilogramQuantity('Quantity', 0.123).caseOf({
        Right: (q) => ({tag: 'Kilogram' as const, value: q}),
        Left: throwOnLeft
    })
    const price = unsafeCreatePrice(45.67)
    
    const result = multiplyPrice(quantity, price)
    
    assert.equal(result.isRight(), true)
    const totalPrice = result.caseOf({
        Right: (p) => p,
        Left: throwOnLeft
    })
    
    // 0.123 kg * 45.67 = 5.61741 ≈ 5.617
    // In fixed-3: 123 * 45670 / 1000 = 5617410 / 1000 = 5617 (with rounding)
    assert.equal(totalPrice.value, 5617n)
})
