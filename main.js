import Grid from "./grid.js";
import Row from "./row.js";

const container = document.getElementById('container');

const res = await fetch('data.json');
const data = await res.json();
const grid = new Grid(container, data);