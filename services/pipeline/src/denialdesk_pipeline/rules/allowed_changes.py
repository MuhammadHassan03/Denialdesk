"""Which claim fields a corrected claim may change, per denial code. Config only.

A code that is missing here may not have a corrected claim at all.
"""

MODIFIER_FIELD = "modifier"
PROCEDURE_CODE_FIELD = "procedure_code"
AUTHORIZATION_NUMBER_FIELD = "authorization_number"

ALLOWED_CHANGE_FIELDS: dict[str, frozenset[str]] = {
    "CO-4": frozenset({MODIFIER_FIELD, PROCEDURE_CODE_FIELD}),
    "CO-16": frozenset(
        {
            "member_id",
            "patient_name",
            "patient_date_of_birth",
            "subscriber_name",
            "diagnosis_code",
            "place_of_service",
            "rendering_provider_npi",
            "billing_provider_npi",
            "referring_provider_npi",
            "service_date",
            "units",
            MODIFIER_FIELD,
            AUTHORIZATION_NUMBER_FIELD,
        }
    ),
    "CO-197": frozenset({AUTHORIZATION_NUMBER_FIELD}),
}
