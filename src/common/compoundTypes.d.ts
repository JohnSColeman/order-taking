import {
    String50,
    EmailAddress,
    VipStatus,
    ZipCode,
    UsStateCode
} from './simpleTypes'

export type PersonalName = {
    FirstName: String50
    LastName: String50
}

export type CustomerInfo = {
    Name: PersonalName
    EmailAddress: EmailAddress
    VipStatus: VipStatus
}

export type Address = {
    AddressLine1: String50
    AddressLine2: String50 | null
    AddressLine3: String50 | null
    AddressLine4: String50 | null
    City: String50
    ZipCode: ZipCode
    State: UsStateCode
    Country: String50
}
