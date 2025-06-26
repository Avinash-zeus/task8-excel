export default class DataStore {
    constructor(initialData = [], rowCount = 50000, colCount = 500) {
        // If initialData is an array of objects, process it to 2D array with keys as first row
        if (Array.isArray(initialData) && initialData.length > 0 && typeof initialData[0] === 'object') {
            const keys = Object.keys(initialData[0]);
            const table = [keys];

            initialData.forEach(obj => {
                const row = keys.map(k => obj[k] !== undefined ? obj[k] : '');
                table.push(row);
            });

            this.rows = table.length;
            this.cols = keys.length;
            this.data = table;
        } else {
            this.rows = rowCount;
            this.cols = colCount;
            this.data = Array.from({ length: rowCount }, (_, i) =>
                Array.from({ length: colCount }, (_, j) =>
                    (initialData[i] && initialData[i][j] !== undefined) ? initialData[i][j] : ''
                )
            );
        }

        console.log(this.data);
    }

    getCell(row, col) {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return '';
        return this.data[row][col];
    }

    setCell(row, col, value) {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return;
        this.data[row][col] = value;
    }

    getRow(row) {
        if (row < 0 || row >= this.rows) return [];
        return this.data[row];
    }

    getCol(col) {
        if (col < 0 || col >= this.cols) return [];
        return this.data.map(row => row[col]);
    }

    getRowCount() {
        return this.rows;
    }

    getColCount() {
        return this.cols;
    }
}