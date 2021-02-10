var math = {
    parseFloat: d => parseFloat(d.toFixed(2)),
    future_time: (date, timeInMs) => new Date(new Date(date).getTime() + timeInMs)
}

module.exports = math;
