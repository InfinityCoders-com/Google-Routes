// function from Google Maps https://cloud.google.com/blog/products/maps-platform/how-calculate-distances-map-maps-javascript-api
function haversine_distance(mk1, mk2) {
	var r = 3958.8; // Radius of the Earth in miles
	var R = r * 1609.34; // Miles in meter
	var rlat1 = mk1.lat * (Math.PI / 180); // Convert degrees to radians
	var rlat2 = mk2.lat * (Math.PI / 180); // Convert degrees to radians
	var difflat = rlat2 - rlat1; // Radian difference (latitudes)
	var difflon = (mk2.lng - mk1.lng) * (Math.PI / 180); // Radian difference (longitudes)

	var d =
		2 *
		R *
		Math.asin(
			Math.sqrt(
				Math.sin(difflat / 2) * Math.sin(difflat / 2) +
					Math.cos(rlat1) *
						Math.cos(rlat2) *
						Math.sin(difflon / 2) *
						Math.sin(difflon / 2)
			)
		);
	return parseFloat(d.toFixed(2));
}

module.exports = haversine_distance;
