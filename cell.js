export default class Cell {
    constructor(row, col) {
        this.row = row;
        this.col = col;
    }

    drawCell(ctx, x, y, content = 'Hello') {
        // ctx.fillStyle = '#fff';
        // ctx.fillRect(x, y, this.col.width, this.row.height);
        ctx.fillStyle = '#000';
        ctx.fillText(content, x + 6, y + 16);
    }

    editData(val) {
        this.data = val;
    }
}