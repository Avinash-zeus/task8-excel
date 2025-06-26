import Grid from "./grid.js";
import DataStore from "./dataStore.js";

const container = document.getElementById('container');

const res = await fetch('data.json');
const json = await res.json();
const data = new DataStore(json);

const grid = new Grid(container, data);