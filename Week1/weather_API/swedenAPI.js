const fetch = require("node-fetch");
const sleep = require("sleep");
const geolib = require("geolib");
const fs = require('fs');

const baseUrl = 'https://opendata-download-metfcst.smhi.se/api/category/pmp3g/version/2/geotype'; //setting base url with all static parameters
const coordinatesUrl = `${baseUrl}/multipoint.json?downsample=2`; //getting coordinates from the api
// const polygonUrl = `${baseUrl}/polygon.json`;
//declaring polygon variable from the api
const polygonBoundaries = [
    { latitude: 52.50044, longitude: 2.250475 },
    { latitude: 52.542473, longitude: 27.392184 },
    { latitude: 70.742227, longitude: 37.934697 },
    { latitude: 70.666011, longitude: -8.553029 }
];

const getWeatherData = async url => {
    try {
        const responseCoordinates = await fetch(url);
        if (responseCoordinates.status !== 200) {
            console.log(`Error: ${responseCoordinates.status} - ${responseCoordinates.statusText}`, responseCoordinates);
        }
        const coordinatesCities = await responseCoordinates.json();
        const testedInBoundaries = coordinatesCities.coordinates.filter(city => {
            return geolib.isPointInside({ latitude: city[1], longitude: city[0] }, polygonBoundaries);
        });
        const test = testedInBoundaries.slice(0, 10); // to test code fast, should be removed when code works, 
        // const forecastResults = await Promise.all(
        //     test.map(
        //         async testedCoordinates => {
        //             sleep.sleep(2); // pausing before making each fetch
        //             const result = await fetch(`${baseUrl}/point/lon/${Math.floor(testedCoordinates[0] * 1000000) / 1000000}/lat/${Math.floor(testedCoordinates[1] * 1000000) / 1000000}/data.json`);
        //             if (result.status !== 200) {
        //                 console.log(`Error: ${result.status} - ${result.statusText}`, testedCoordinates);
        //             }
        //             return await result.json();
        //         }
        //     )
        // );
        //commented out when testing
        const forecastResults = await Promise.all(
            testedInBoundaries.map( //Make sure you replace test with testedInBoundaries variable
                async testedCoordinates => {
                    sleep.sleep(2); // pausing before making each fetch
                    const result = await fetch(`${baseUrl}/point/lon/${Math.floor(testedCoordinates[0] * 1000000) / 1000000}/lat/${Math.floor(testedCoordinates[1] * 1000000) / 1000000}/data.json`);
                    if (result.status !== 200) {
                        console.log(`Error: ${result.status} - ${result.statusText}`, testedCoordinates);
                    }
                    return await result.json();
                }
            )
        );
        //getting altitude information for the same cities;
        const fullCoordinates = await Promise.all(
            test.map(
                async coordinates => {
                    sleep.sleep(2);
                    const altitude = await fetch(`https://api.open-elevation.com/api/v1/lookup\?locations\=${coordinates[1]},${coordinates[0]}`);
                    if (altitude.status !== 200) {
                        console.log(`${altitude.status} - ${altitude.statusText}`, coordinates);
                    }
                    return await altitude.json();
                }
            )
        );
        const structuredCoordinates = fullCoordinates.map(result => {
            return {
                longitude: result.results[0].longitude,
                latitude: result.results[0].latitude,
                altitude: result.results[0].elevation
            }
        });
        const results = forecastResults.map(forecast => {
            return {
                location:
                    structuredCoordinates
                        .filter(coordinates =>
                            coordinates.longitude === forecast.geometry.coordinates[0][0]
                            && coordinates.latitude === forecast.geometry.coordinates[0][1]
                        )[0],
                weather:
                    forecast.timeSeries.map(result => {
                        return {
                            time: result.validTime,
                            tempC: result.parameters
                                .filter(parameter => {
                                    return parameter.name === 't'
                                })
                                .map(parameter => {
                                    return parameter.values;
                                })[0][0],
                            pressureHPA: result.parameters
                                .filter(parameter => {
                                    return parameter.name === 'msl'
                                })
                                .map(parameter => {
                                    return parameter.values;
                                })[0][0],
                            humidityPER: result.parameters
                                .filter(parameter => {
                                    return parameter.name === 'r';
                                })
                                .map(parameter => {
                                    return parameter.values;
                                }
                                )[0][0],
                        };
                    }
                )
            }
        });
        // used only when needed to save results
        // fs.writeFile('results.json', JSON.stringify(results,null,2), (err) => {
        //     if (err) throw err;
        //     console.log('The file has been saved!');
        // });
        console.log(results)
    } catch (error) {
        console.error(error);
    }
};

getWeatherData(coordinatesUrl);