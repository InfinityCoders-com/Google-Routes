const request = require("request")
const chunk = require('chunk')
const delay = require('delay')
const decodePolyline = require("decode-google-map-polyline")
const fs = require('fs')
const { parseFloat, future_time } = require("./utility/math_date")
const haversine_distance = require("./utility/map")

var env = 'prod'

const tripCreateQaToken = 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo0OTM1fQ.j-dQr0FzMBuLSH2B0GSdAohxK2vbq9uru4qNlBHcpJw';
const tripCreateToken = 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjozNDA2fQ.mT0I9pkJlM6Qw-7Zp9wbhQI79Md4OUp9DO1flQEZem8';
const tripCreateBaseUrl = {
	prod: 'https://transportation-trips.fareye.co/',
	qa: 'https://tpt-qa.fareye.co:3001/'
}

const pingInsertToken = 'Basic dGVzdDpGYXJleWVAMTIz'
const pingInsertUrl = {
	prod: 'http://13.127.205.146:3000/trucks/fareye/gpsTrackpost',
	qa: 'http://13.127.205.146:3000/trucks/fareye/gpsTrackpost'
}

const mapsApiUrl = `https://maps.googleapis.com/maps/api/directions/json`;
var mapKey = ''

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

async function generateApiData({ route_data, tripData, vehicle_no }) {
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
		if (i == chunks.length - 1) {
			await createJourney({ tripData })
		}
		await delay(300);
	}
}

const filename = name => name.split(' ').join('-')

const getVehicleHistory = async ({ createTripPings, tripData, generateStops }) => {
	try {
		let { origin, destination, sd, demo = false, vehicle_no, transit_mode } = createTripPings;
		let query = `?origin=${origin}&destination=${destination}&transit_mode=${transit_mode}&key=${mapKey}`;
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
						let api_data = generateApiData({ route_data, vehicle_no, tripData })
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

async function createJourney({ tripData }) {
	const tripCreateUrl = `${tripCreateBaseUrl[env]}api/v1/journeys/fareye_create`
	const payload = tripData 
	console.log(payload);
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
			console.log('Failed creating journey for :', tripData.vehicle_no, e, r, data)
		} else if (data) {
			console.log('Journey Created', data);
		} else {
			console.log('Something went wrong while creating journey ')
		}
	})
}

function main() {
	let tempRouteDataFilePath = process.argv.find(file => file.includes('route-file'))
	console.log(tempRouteDataFilePath);
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
						let tripsData = JSON.parse(data).journeys
						for (let i = 0; i < tripsData.length; i++) {
							let tripData = tripsData[i]
							let validatePayload = true // Required Fields validation
							if (validatePayload) {
								let mode = tripData.journey.transport_mode;
								let transitMode = (mode == "road") ? "bus" : mode.toLowerCase();
								let journeyNodes = tripData.journey.journey_nodes;
								let startNode = journeyNodes.reduce((prev, current) => (+prev.sequence < +current.sequence) ? prev : current);
								let endNode = journeyNodes.reduce((prev, current) => (+prev.sequence > +current.sequence) ? prev : current)

								console.log(startNode.location_name);
								getVehicleHistory({
									createTripPings: {
										origin: startNode.location_name,
										destination: endNode.location_name,
										sd: tripData.journey.exp_start_time,
										demo: false,
										vehicle_no: tripData.journey.vehicle_no,
										transit_mode: transitMode
									},
									tripData,
									generateStops
								})
							} else {
								console.log(`Data instance ${i + 1} with vehicle No: ${tripData.vehicle_no} failed \n`)
							}
						}
					} else {
						console.log('Error in file content. \n')
					}
				}
				// console.log(data, Array.isArray(JSON.parse(data)) );
			})
		} else {
			console.log(`File Path variable missing. Provide route-file='/your-file-path/file.json' \n`)
		}
	} catch (er) {
		console.log('Error ', er)
	}
}

main()
