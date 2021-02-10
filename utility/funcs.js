const jsonFromKeys = (obj, keys) => {
    let tempObj = {}
    keys.forEach(key => {
        tempObj[key] = obj[key]
    })
    return tempObj
}

module.exports = {
    jsonFromKeys
}