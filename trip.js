const request = require("request")
const chunk = require('chunk')
const delay = require('delay')
const decodePolyline = require("decode-google-map-polyline")
const fs = require('fs')
const { parseFloat, future_time } = require("./utility/math_date")
const haversine_distance = require("./utility/map")
const CONST = require('./utility/constants.json')

var env = 'prod'

const tripCreateQaToken = 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo1MTEyfQ.-zZwWAaH0odx6rhMd8S_XMrODS82IVHP_djERtiGGn4';
const tripCreateToken = 'Bearer eyJhbGciOiJub25lIn0.eyJ1c2VyX2lkIjo1MTE2LCJuYW1lIjoiQWJoaXNoZWsiLCJlbWFpbCI6ImFiaGlzaGVrLnNyaUB1c2VkaXBwZXIuY29tIiwicGhvbmVfbnVtYmVyIjoiOTk5OTk0NzQ5MSIsInJvbGUiOiJDb25zaWduZXIiLCJleHAiOjE2MDgyNzMyMjR9.'
const tripCreateBaseUrl = {
	prod: 'https://transportation-trips.fareye.co/',
	qa: 'https://tpt-qa.fareye.co/'
}

const pingInsertToken = 'Basic dGVzdDpGYXJleWVAMTIz'
const pingInsertUrl = {
	prod: 'http://13.127.205.146:3000/trucks/fareye/gpsTrackpost',
	qa: 'http://13.127.205.146:3000/trucks/fareye/gpsTrackpost'
}

const mapsApiUrl = `https://maps.googleapis.com/maps/api/directions/json`;
var mapKey = 'AIzaSyBZbiDpFhGYByYCBwdy_oY3zQP_0PGa2HY' // new api for gts server
// 'AIzaSyAMRfigkZLcs5qTEHrwHqCP7vfieyAQSHw' my micosoft api

function generateLogFileData({ route_data, vehicle_no, source = "trucks_create" }) {
	let temp = ''
	route_data.forEach(d => {
		temp += JSON.stringify({
			"source": source,
			"load": {
				"vehicle_no": `${vehicle_no}`,
				...d,
				ist_timestamp: JSON.stringify(d.ist_timestamp).replace(/"|Z|T/g, ' ').trim()
			}
		}) + '\n'
	})
	return temp
}

async function generateApiData({ tripData, route_data, vehicle_no }) {
	let payloadWithVehicle = route_data.map(i => ({
		...i,
		vehicle_no,
		companyTimeZone: 'Asia/Kolkata',
		timestamp: JSON.stringify(i.ist_timestamp)
			.replace(/"|Z|T/g, ' ').trim().substr(0, 19),
		sync: true
	}))
	const chunks = chunk(payloadWithVehicle, 50)
	for (let i = 0; i < chunks.length; i++) {
		let temp = chunks[i];
		const options = {
				url: pingInsertUrl[env],
			method: "POST",
				headers: {
					'Authorization': pingInsertToken,
					'Content-Type': 'application/json'
				},
			json: {
				"pings": temp
			}
		}
		await request(options, (e, r, data) => {
			console.log('Total Entries: ', payloadWithVehicle.length, 'iteration: ', i, 'trip insert', data);
		})
		await delay(300);
		if (i === chunks.length - 1) {
			await createTrip({ tripData })
		}
	}
}

const filename = name => name.split(' ').join('-')

const getVehicleHistory = async ({ createTripPings, generateStops, tripData }) => {
	try {
		let { origin, destination, sd, demo = false, vehicle_no } = createTripPings;
		let query = `?origin=${origin}&destination=${destination}&key=${mapKey}`;
		console.log(`${mapsApiUrl}${query}`)
		request(
			`${mapsApiUrl}${query}`,
			{ json: true },
			(err, response, body) => {
				if (err) {
					console.log('Error Fetching pings from google directions API for vehicle no: ', vehicle_no);
				} else {
					let r = response.body && response.body.routes;
					let bounds;
					if (r && r.length && r[0].overview_polyline) {
						bounds = decodePolyline(
							r[0].overview_polyline.points
						);
					}
					if (
						r &&
						r.length &&
						r[0].legs &&
						r[0].legs.length &&
						r[0].legs[0].steps &&
						r[0].legs[0].steps.length
					) {
						var totDur = r[0].legs[0].duration.value / 10
						var steps = r[0].legs[0].steps
						var dist = 0;
						var dur = 0;
						var route_data = []
						var startDate = sd ? new Date(sd) : null
						for (i = 0; i < steps.length; i++) {
							var item = steps[i]
							dist = dist + item.distance.value;
							dur = dur + item.duration.value;
							var temp_step_bounds = decodePolyline(item.polyline.points)
							startDate = startDate
								? i === 0
									? startDate
									: future_time(startDate, 1000 * item.duration.value)
								: null
							route_data.push({
								latitude: item.start_location.lat,
								longitude: item.start_location.lng,
								ist_timestamp: startDate,
								speed: Math.ceil(
									(item.distance.value / item.duration.value) *
									3.6
								)
							})
							if (i % 3 == 0 && generateStops) {
								startDate = future_time(startDate, 7 * 60 * 1000)
								route_data.push({
									latitude: item.start_location.lat,
									longitude: item.start_location.lng,
									ist_timestamp: startDate,
									speed: 0
								})
								startDate = future_time(startDate, 9 * 60 * 1000)
								route_data.push({
									latitude: item.start_location.lat,
									longitude: item.start_location.lng,
									ist_timestamp: startDate,
									speed: 0
								})
								startDate = future_time(startDate, 10 * 60 * 1000)
								route_data.push({
									latitude: item.start_location.lat,
									longitude: item.start_location.lng,
									ist_timestamp: startDate,
									speed: 0
								})
								startDate = future_time(startDate, 6 * 60 * 1000)
								route_data.push({
									latitude: item.start_location.lat,
									longitude: item.start_location.lng,
									ist_timestamp: startDate,
									speed: 0
								})
							}
							for (j = 1; j < temp_step_bounds.length; j++) {
								var bound = temp_step_bounds[j]
								var bound_dist = haversine_distance(temp_step_bounds[j - 1], bound)
								var bound_dur = parseFloat(item.duration.value / (item.distance.value / bound_dist))
								startDate = startDate && future_time(startDate, bound_dur * 1000)
								if (([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]).includes(j % 100)) {
									route_data.push({
										latitude: bound.lat,
										longitude: bound.lng,
										ist_timestamp: startDate,
										speed: 100
									})
								} else {
									route_data.push({
										latitude: bound.lat,
										longitude: bound.lng,
										ist_timestamp: startDate,
										speed: parseFloat(bound_dist / bound_dur)
									})
								}
							}
						}
						let log_data = generateLogFileData({ route_data, vehicle_no })
						let api_data = generateApiData({ tripData, route_data, vehicle_no })
						fs.writeFile(`./pings-${filename(origin)}-${filename(destination)}.log`, log_data, function (err) {
							console.log(`File Saved at ~/dip_scripts/textPings/pings-${filename(origin)}-${filename(destination)}.log`);
						});
					} else {
						console.log("No legs found");
					}
				}
			}
		);
	} catch (e) {
		console.log(e);
	}
}

async function createTrip({ tripData }) {
	const tripCreateUrl = `${tripCreateBaseUrl[env]}api/v1/consigner_trips/fareye_trip_create`
	const payload = { "consigner_trip": tripData }
	// validating tripData to create trip remaining
	const options = {
		url: tripCreateUrl,
		method: "POST",
		auth: {
			bearer: env == 'prod' ? tripCreateToken : tripCreateQaToken
		},
		headers: {
			'Content-Type': 'application/json'
		},
		json: payload
	}
	request(options, (e, r, data) => {
		if (e) {
			console.log('Failed creating trip for :', tripData.vehicle_no, e, r, data)
		} else if (data) {
			console.log('Trip Created', data);
		} else {
			console.log('Something went wrong while creating trip ')
		}
	})
}

function automation() {
	let tempRouteDataFilePath = process.argv.find(file => file.includes('route-file'))
	let routeDataFilePath = tempRouteDataFilePath && tempRouteDataFilePath.split('=')[1]
	let tempEnv = process.argv.find(file => file.includes('env'))
	env = tempEnv && tempEnv.split('=')[1] || env
	let tempMapKey = process.argv.find(file => file.includes('map-key'))
	mapKey = tempMapKey && tempMapKey.split('=')[1]
	let generateStops = undefined
	generateStops = process.argv.find(file => file.includes('stops'))
	try {
		if (routeDataFilePath) {
			fs.readFile(routeDataFilePath, "utf8", async (err, data) => {
				if (err) {
					console.log(err)
				} else {
					if (typeof JSON.parse(data) === "object") {
						let tripsData = JSON.parse(data).trip
						for (let i = 0; i < tripsData.length; i++) {
							let tripData = tripsData[i]
							let validatePayload = true // Required Fields validation
							if (validatePayload) {
								await getVehicleHistory({
									createTripPings: {
										origin: tripData.origin,
										destination: tripData.destination,
										sd: tripData.start_date,
										demo: false,
										vehicle_no: tripData.vehicle_no
									},
									generateStops,
									tripData
								})
							} else {
								console.log(`Data instance ${i + 1} with vehicle No: ${tripData.vehicle_no} failed \n`)
							}
						}
					} else {
						console.log('Error in file content. \n')
					}
				}
			})
		} else {
			console.log(`File Path variable missing. Provide route-file='/your-file-path/file.json' \n`)
		}
	} catch (er) {
		console.log('Error ', er)
	}
}

async function tripApi({ data, env: environ, stops, mapKey: key }) {
	const tripsData = data
	mapKey = key
	env = environ
	console.log(tripsData);
	var errorLog = []
	for (let i = 0; i < tripsData.length; i++) {
		let tripData = tripsData[i]
		let instanceError = [] // Required Fields validation
		const isTransportModeValid = CONST.validTransportMode.includes(tripData.transport_mode && tripData.transport_mode.toLowerCase())
		const isVehicleNoValid = tripData && tripData.vehicle_no && tripData.vehicle_no.length > 3
		if (!isTransportModeValid) {
			instanceError.push(`Invalid Transport mode. Provide either ${CONST.validTransportMode}`)
		}
		if (isVehicleNoValid) {
			instanceError.push('Invalid Vehicle no')
		}
		if (instanceError.length) {
			// 'For reference no. ', tripData.reference_number
			errorLog.push(`Error For reference no. ${tripData.reference_number}: ${instanceError.join(', ')}`)
			console.log(`Data instance ${i + 1} with vehicle No: ${tripData.vehicle_no} failed \n`)
		} else {
			// await getVehicleHistory({
			// 	createTripPings: {
			// 		origin: tripData.origin,
			// 		destination: tripData.destination,
			// 		sd: tripData.start_date,
			// 		demo: false,
			// 		vehicle_no: tripData.vehicle_no
			// 	},
			// 	generateStops: !!stops,
			// 	tripData
			// })
			if (parseInt(tripData.replicate) > 0) {
				console.log(tripData.replicate, typeof tripData.replicate, tripData.exception_idle, tripData.exception_overspeed);
			}
		}
	}
	if (errorLog.length) {
		res.status(422).send({ data: errorLog, message: 'error' })
	} else {
		res.status(200).send('Successfully Processed.')
	}
}

module.exports = {
	automation,
	tripApi
}