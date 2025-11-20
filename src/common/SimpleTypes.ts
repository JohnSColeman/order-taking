import {Either, Left as Err, Right as Ok} from 'purify-ts'

type Result<T, E> = Either<E, T>

// Domain simple and constrained types for OrderTaking

// Opaque wrappers
export type String50 = { tag: 'String50'; value: string }
export type EmailAddress = { tag: 'EmailAddress'; value: string }

export type VipStatus = 'Normal' | 'VIP'

export type ZipCode = { tag: 'ZipCode'; value: string }
export type UsStateCode = { tag: 'UsStateCode'; value: string }

export type OrderId = { tag: 'OrderId'; value: string }
export type OrderLineId = { tag: 'OrderLineId'; value: string }

export type WidgetCode = { tag: 'WidgetCode'; value: string }
export type GizmoCode = { tag: 'GizmoCode'; value: string }
export type ProductCode =
    | { tag: 'Widget'; value: WidgetCode }
    | { tag: 'Gizmo'; value: GizmoCode }

export type UnitQuantity = { tag: 'UnitQuantity'; value: number }
export type KilogramQuantity = { tag: 'KilogramQuantity'; value: bigint } // fixed-3 thousandths
export type OrderQuantity =
    | { tag: 'Unit'; value: UnitQuantity }
    | { tag: 'Kilogram'; value: KilogramQuantity }

export type Price = { tag: 'Price'; value: bigint } // fixed-3 thousandths
export type BillingAmount = { tag: 'BillingAmount'; value: bigint } // fixed-3 thousandths

export type PdfAttachment = {
    Name: string
    Bytes: Uint8Array
}

export type PromotionCode = { tag: 'PromotionCode'; value: string }

// Constrained creation helpers
// Fixed-3 helpers
const scale3 = (n: number): bigint => BigInt(Math.round(n * 1000))
const toNumber3 = (v: bigint): number => Number(v) / 1000

function createString<T>(
    fieldName: string,
    ctor: (s: string) => T,
    maxLen: number,
    str: string | null | undefined
): Result<T, string> {
    if (str == null || str.length === 0) {
        return Err(`${fieldName} must not be null or empty`)
    }
    if (str.length > maxLen) {
        return Err(`${fieldName} must not be more than ${maxLen} chars`)
    }
    return Ok(ctor(str))
}

function createStringOption<T>(
    fieldName: string,
    ctor: (s: string) => T,
    maxLen: number,
    str: string | null | undefined
): Result<T | null, string> {
    if (str == null || str.length === 0) {
        return Ok(null)
    }
    if (str.length > maxLen) {
        return Err(`${fieldName} must not be more than ${maxLen} chars`)
    }
    return Ok(ctor(str))
}

function createInt<T>(
    fieldName: string,
    ctor: (n: number) => T,
    minVal: number,
    maxVal: number,
    n: number
): Result<T, string> {
    if (n < minVal) {
        return Err(`${fieldName}: Must not be less than ${minVal}`)
    }
    if (n > maxVal) {
        return Err(`${fieldName}: Must not be greater than ${maxVal}`)
    }
    return Ok(ctor(n))
}

function createDecimal<T>(
    fieldName: string,
    ctor: (n: bigint) => T,
    minVal: number,
    maxVal: number,
    n: number
): Result<T, string> {
    const scaled = scale3(n)
    const minS = scale3(minVal)
    const maxS = scale3(maxVal)
    if (scaled < minS) return Err(`${fieldName}: Must not be less than ${minVal}`)
    if (scaled > maxS) return Err(`${fieldName}: Must not be greater than ${maxVal}`)
    return Ok(ctor(scaled))
}

function createDecimalFromFixed<T>(
    fieldName: string,
    ctor: (n: bigint) => T,
    minVal: number,
    maxVal: number,
    scaledValue: bigint
): Result<T, string> {
    const minS = scale3(minVal)
    const maxS = scale3(maxVal)
    if (scaledValue < minS) return Err(`${fieldName}: Must not be less than ${minVal}`)
    if (scaledValue > maxS) return Err(`${fieldName}: Must not be greater than ${maxVal}`)
    return Ok(ctor(scaledValue))
}

function createLike<T>(
    fieldName: string,
    ctor: (s: string) => T,
    pattern: RegExp,
    str: string | null | undefined
): Result<T, string> {
    if (str == null || str.length === 0) {
        return Err(`${fieldName}: Must not be null or empty`)
    }
    if (pattern.test(str)) {
        return Ok(ctor(str))
    }
    return Err(`${fieldName}: '${str}' must match the pattern '${pattern.source}`)
}

export function valueString50(x: String50): string {
    return x.value
}

export function createString50(fieldName: string, s: string): Result<String50, string> {
    return createString(fieldName, (v) => ({tag: 'String50', value: v}), 50, s)
}

export function createString50Option(fieldName: string, s: string | null | undefined): Result<String50 | null, string> {
    return createStringOption(fieldName, (v) => ({tag: 'String50', value: v}), 50, s ?? '')
}

export function valueEmailAddress(x: EmailAddress): string {
    return x.value
}

export function createEmailAddress(fieldName: string, s: string): Result<EmailAddress, string> {
    const pattern = /.+@.+/
    return createLike(fieldName, (v) => ({tag: 'EmailAddress', value: v}), pattern, s)
}

export function valueVipStatus(s: VipStatus): string {
    return s
}

export function createVipStatus(fieldName: string, s: string): Result<VipStatus, string> {
    switch (s) {
        case 'normal':
        case 'Normal':
            return Ok('Normal')
        case 'vip':
        case 'VIP':
            return Ok('VIP')
        default:
            return Err(`${fieldName}: Must be one of 'Normal', 'VIP'`)
    }
}

export function valueZipCode(x: ZipCode): string {
    return x.value
}

export function createZipCode(fieldName: string, s: string): Result<ZipCode, string> {
    const pattern = /^\d{5}$/
    return createLike(fieldName, (v) => ({tag: 'ZipCode', value: v}), pattern, s)
}

export function valueUsStateCode(x: UsStateCode): string {
    return x.value
}

export function createUsStateCode(fieldName: string, s: string): Result<UsStateCode, string> {
    const pattern = /^(A[KLRZ]|C[AOT]|D[CE]|FL|GA|HI|I[ADLN]|K[SY]|LA|M[ADEINOST]|N[CDEHJMVY]|O[HKR]|P[AR]|RI|S[CD]|T[NX]|UT|V[AIT]|W[AIVY])$/
    return createLike(fieldName, (v) => ({tag: 'UsStateCode', value: v}), pattern, s)
}

export function valueOrderId(x: OrderId): string {
    return x.value
}

export function createOrderId(fieldName: string, s: string): Result<OrderId, string> {
    return createString(fieldName, (v) => ({tag: 'OrderId', value: v}), 50, s)
}

export function valueOrderLineId(x: OrderLineId): string {
    return x.value
}

export function createOrderLineId(fieldName: string, s: string): Result<OrderLineId, string> {
    return createString(fieldName, (v) => ({tag: 'OrderLineId', value: v}), 50, s)
}

export function valueWidgetCode(x: WidgetCode): string {
    return x.value
}

export function createWidgetCode(fieldName: string, s: string): Result<WidgetCode, string> {
    const pattern = /^W\d{4}$/
    return createLike(fieldName, (v) => ({tag: 'WidgetCode', value: v}), pattern, s)
}

export function valueGizmoCode(x: GizmoCode): string {
    return x.value
}

export function createGizmoCode(fieldName: string, s: string): Result<GizmoCode, string> {
    const pattern = /^G\d{3}$/
    return createLike(fieldName, (v) => ({tag: 'GizmoCode', value: v}), pattern, s)
}

export function valueProductCode(pc: ProductCode): string {
    return pc.tag === 'Widget' ? pc.value.value : pc.value.value
}

export function createProductCode(fieldName: string, code: string): Result<ProductCode, string> {
    if (code == null || code.length === 0) {
        return Err(`${fieldName}: Must not be null or empty`)
    }
    if (code.startsWith('W')) {
        return createWidgetCode(fieldName, code).map((w) => ({tag: 'Widget', value: w}))
    }
    if (code.startsWith('G')) {
        return createGizmoCode(fieldName, code).map((g) => ({tag: 'Gizmo', value: g}))
    }
    return Err(`${fieldName}: Format not recognized '${code}'`)
}

export function valueUnitQuantity(x: UnitQuantity): number {
    return x.value
}

export function rawUnitQuantity(x: UnitQuantity): number {
    return x.value
}

export function createUnitQuantity(fieldName: string, n: number): Result<UnitQuantity, string> {
    return createInt(fieldName, (v) => ({tag: 'UnitQuantity', value: v}), 1, 1000, n)
}

export function valueKilogramQuantity(x: KilogramQuantity): number {
    return toNumber3(x.value)
}

export function rawKilogramQuantity(x: KilogramQuantity): bigint {
    return x.value
}

export function createKilogramQuantity(fieldName: string, n: number): Result<KilogramQuantity, string> {
    return createDecimal(fieldName, (v) => ({tag: 'KilogramQuantity', value: v}), 0.05, 100.0, n)
}

export function valueOrderQuantity(q: OrderQuantity): number {
    return q.tag === 'Unit' ? q.value.value : valueKilogramQuantity(q.value)
}

export function createOrderQuantity(fieldName: string, productCode: ProductCode, quantity: number): Result<OrderQuantity, string> {
    if (productCode.tag === 'Widget') {
        return createUnitQuantity(fieldName, Math.trunc(quantity)).map((uq) => ({tag: 'Unit', value: uq}))
    } else {
        return createKilogramQuantity(fieldName, quantity).map((kq) => ({tag: 'Kilogram', value: kq}))
    }
}

export function valuePrice(x: Price): number {
    return toNumber3(x.value)
}

export function createPrice(n: number): Result<Price, string> {
    return createDecimal('Price', (v) => ({tag: 'Price', value: v}), 0.0, 1000.0, n)
}

export function unsafeCreatePrice(n: number): Price {
    const r = createPrice(n)
    return r.caseOf({
        Right: (price) => price,
        Left: (error) => {
            throw new Error(`Not expecting Price to be out of bounds: ${error}`)
        }
    })
}

export function multiplyPrice(qty: OrderQuantity, p: Price): Result<Price, string> {
    let total: bigint
    if (qty.tag === 'Unit') {
        total = p.value * BigInt(rawUnitQuantity(qty.value))
    } else {
        total = (p.value * rawKilogramQuantity(qty.value)) / 1000n
    }
    return createDecimalFromFixed('Price', (v) => ({tag: 'Price', value: v}), 0.0, 1000.0, total)
}

export function valueBillingAmount(x: BillingAmount): number {
    return toNumber3(x.value)
}

export function createBillingAmount(n: number): Result<BillingAmount, string> {
    return createDecimal('BillingAmount', (v) => ({
        tag: 'BillingAmount',
        value: v
    }), 0.0, 10000.0, n)
}

export function sumPrices(prices: Price[]): Result<BillingAmount, string> {
    const total = prices.reduce<bigint>((acc, p) => acc + p.value, 0n)
    return createDecimalFromFixed('BillingAmount', (v) => ({
        tag: 'BillingAmount',
        value: v
    }), 0.0, 10000.0, total)
}
