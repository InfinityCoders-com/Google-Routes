var http = require('http');
var formidable = require('formidable');
const fs = require('fs')
var XLSX = require('xlsx');
const { tripApi } = require('./trip')

const port = 4000

http.createServer(function (req, res) {
	if (req.url == '/fileupload') {
		var form = new formidable.IncomingForm();
		form.parse(req, function (err, fields, files) {
			res.write('File uploaded');
			res.end();
			var workbook = XLSX.readFile(files.filetoupload.path);
			var sheet_name_list = workbook.SheetNames;
			sheet_name_list.forEach(function (y) {
				var worksheet = workbook.Sheets[y];
				var headers = {};
				var data = [];
				for (z in worksheet) {
					if (z[0] === '!') continue;
					//parse out the column, row, and value
					var tt = 0;
					for (var i = 0; i < z.length; i++) {
						if (!isNaN(z[i])) {
							tt = i;
							break;
						}
					};
					var col = z.substring(0, tt);
					var row = parseInt(z.substring(tt));
					var value = worksheet[z].v;
					//store header names
					if (row == 1 && value) {
						headers[col] = value;
						continue;
					}
					if (!data[row]) data[row] = {};
					data[row][headers[col]] = value || '';
				}
				data = data.filter(item => item != null || Object.keys(item).length == 0)
				tripApi({
					data,
					env: 'qa',
					mapKey: 'AIzaSyAMRfigkZLcs5qTEHrwHqCP7vfieyAQSHw',
					stops: true
				})
				fs.writeFile('routes.json', JSON.stringify({ trip: data }), function (err) {
					if (err) throw err;
					console.log('Saved!');
				});
			});
		});
	} else {
		res.writeHead(200, { 'Content-Type': 'text/html' });
		res.write('<form action="fileupload" method="post" enctype="multipart/form-data">');
		res.write('<input type="file" name="filetoupload">');
		res.write('<input type="submit">');
		res.write('</form>');
		return res.end();
	}
}).listen(port);
console.log('Server listening on port', port);
