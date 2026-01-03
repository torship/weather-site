const APIKEY = "9a4e7f98a759fccb55c7d2e2a2355d54";
// const city = "Delhi";
const apiUrl = "https://api.openweathermap.org/data/2.5/weather?";

const searchbox = document.querySelector(".search input");
const searchbtn = document.querySelector(".search button");


async function checkWeather(city){
    const response = await fetch(apiUrl + `q=${city}&appid=${APIKEY}&units=metric`);
    var data = await response.json();
    console.log(data);
    document.querySelector(".city").innerHTML = data.name;
    document.querySelector(".temp").innerHTML = Math.round(data.main.temp) + "°c";
    document.querySelector(".humidity").innerHTML = data.main.humidity + "%";
    document.querySelector(".wind").innerHTML = data.wind.speed + "km/h";
}
checkWeather();

 searchbtn.addEventListener("click", ()=>{
    checkWeather(searchbox.value);
 }
 )
