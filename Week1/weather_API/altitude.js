const fetch = require("node-fetch");
const sleep = require("sleep");

const citiesUrl = 'https://gist.githubusercontent.com/randymeech/e9398d4f6fb827e2294a/raw/22925b92339f0f4c005159ae4d36f8f3988e9d39/top-1000-cities.json'
const getWeatherData = async (url) => {
    try {
        const cities = await fetch(url);
        const citiesCoordinates = await cities.json();
        const test = citiesCoordinates.slice(0,10);
        const results = await Promise.all(test.map(
            async data => {
              sleep.sleep(2);
              const result = await fetch(`https://api.open-elevation.com/api/v1/lookup\?locations\=${data.lat},${data.lng}`);
                if(result.status !== 200) {
                    console.log(result.status, data);
                }
                return result.json();;
            }
          ));
          console.log(results[0]);
       const structuredResults = results.map(result => {
           return {
               longitude: result.results[0].longitude,
               latitude: result.results[0].latitude,
               altitude: result.results[0].elevation
            }
       });
        console.log(structuredResults);
    } catch (error) {
        console.log(error);
    }
}
getWeatherData(citiesUrl);