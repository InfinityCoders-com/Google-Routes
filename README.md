# Google-Routes
##### Script to create Trip creation with its vehicle history using google apis.


## Consigner Trip Model

### Sample request would be like
``` node script-trip.js route-file='path/to/file.json' env='qa' map-key='apikeyforgoogledirections' ```

Requires few required and optional parameters from command line as arguments

|arg | value | Required | Default | |
|--|--|--|--|--|
|route-file |path/to/file.json |Required | ./data/routes.json | |
|map-key |google directions API key |Required | | |
|env |prod / qa |Optional |prod | [transportation-trips/tpt-qa].fareye.co|
|stops | |Optional |undefined | generate stops in trip |


> Sample Excel format available under data folder

Sample json required 

```
{
    trip: [
        {
            "start_date": "2020-12-15 12:00:00",
            "origin": "Houston, Missouri 65483, USA",
            "destination": "Chicago, Illinois, USA",
            "vehicle_no": "2913279",
            "transporter": "Coyote Trucking",
            "transporter_code": "1011",
            "transport_mode": "",
            "consigner_name": "Meso Corp",
            "consigner_code": "ABHI",
            "consignee_name": "Nanco Distribution Co.",
            "driver_name": "Jacob Lentz",
            "driver_number": "13128183540",
            "consigner_lat": "41.8034",
            "consigner_long": "-87.8309",
            "consignee_lat": "39.90330564",
            "consignee_long": "-75.15274387",
            "lr_no": "fe/trn/12356/2913279",
            "sub_lr_no": "fe/trn/12356/2913279",
            "material": "123",
            "reference_number": "2020121500",
            "record_status": "CRE",
            "delivery_no": "",
            "origin_pincode": "",
            "destination_pincode": "000000",
            "IMEI": null,
            "eta": "2020-05-29 02:12:00",
            "transit_time": "",
            "vehicle_type": "",
            "driver_license_number": "",
            "plant_code": "46",
            "ship_to_code": "satna",
            "shipper_id": "",
            "trucker_id": "",
            "employee_code": "",
            "company_name": "ABHI",
            "consigner_email": "",
            "consigner_contact_number": "",
            "consignee_email": "",
            "consignee_contact_number": "",
            "shipping_address": "Dummy",
            "origin_address": "",
            "invoice_qty": "200",
            "leg_no": "",
            "vehicle_entry_time": "2020-05-28 02:12:00",
            "vehicle_exit_time": "",
            "vehicle_unloading_entry_time": "",
            "vehicle_unloading_exit_time": "",
            "invoice_no": "1-2-Newjob211",
            "dispatch_type": "",
            "return_load": false,
            "challan_no": "00000",
            "route": "",
            "loading_area": ""
        }
    ]
}
```

## Journey Model

### Sample request would be like
``` node script-trip.js route-file='path/to/file.json' env='qa' map-key='apikeyforgoogledirections' ```
