const { Client } = require("@googlemaps/google-maps-services-js")

const client = new Client({});

client
    .directions({
        params: {
            origin: 'lucknow',
            destination: 'delhi',
            travelMode: 'TRANSIT',
            transitOptions: {
                modes: ['RAIL', 'TRAIN']
            },
            // drivingOptions: DrivingOptions,
            // unitSystem: UnitSystem,
            // waypoints[]: DirectionsWaypoint,
            optimizeWaypoints: Boolean,
            provideRouteAlternatives: Boolean,
            avoidFerries: true,
            avoidHighways: false,
            avoidTolls: false,
            key: "AIzaSyAMRfigkZLcs5qTEHrwHqCP7vfieyAQSHw",
        },
        timeout: 1000, // milliseconds
    })
    .then((r) => {
        console.log(JSON.stringify(r.data));
    })
    .catch((e) => {
        console.log(e.response.data.error_message);
    });