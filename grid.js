import Cell from "./cell.js";
import Row from "./row.js";
import Column from './column.js';

export default class Grid {
    constructor(container, data = [], totalRows = 100000, totalCols = 500) {
        this.container = container;
        this.totalRows = totalRows;
        this.totalCols = totalCols;
        this.data = data;

        this.gridContainer = document.createElement('div');
        this.gridContainer.classList.add('gc');
        this.container.appendChild(this.gridContainer);

        this.spacerContainer = document.createElement('div');
        this.spacerContainer.classList.add('sc');
        this.gridContainer.appendChild(this.spacerContainer);

        // Data structures
        this.columns = Array.from({ length: totalCols }, (_, i) => new Column(i, 100, totalRows));
        this.rows = Array.from({ length: totalRows }, (_, i) => new Row(i, 25, totalCols));

        // Spacer for scroll
        this.virtualWidth = totalCols * this.columns[0].width + 30;
        this.virtualHeight = totalRows * this.rows[0].height + 10;
        this.spacer = document.createElement('div');
        this.spacer.style.width = this.virtualWidth + 'px';
        this.spacer.style.height = this.virtualHeight + 'px';
        this.spacerContainer.appendChild(this.spacer);

        this.headerHeight = 30;
        this.headerWidth = 50;

        // --- Create three canvases ---
        // 1. Column header canvas
        this.colHeaderCanvas = document.createElement('canvas');
        this.colHeaderCanvas.classList.add('colHeaderCanvas');
        this.colHeaderCanvas.style.left = this.headerWidth + 'px';
        this.gridContainer.appendChild(this.colHeaderCanvas);
        this.colHeaderCtx = this.colHeaderCanvas.getContext("2d");

        // 2. Row header canvas
        this.rowHeaderCanvas = document.createElement('canvas');
        this.rowHeaderCanvas.classList.add('rowHeaderCanvas');
        this.rowHeaderCanvas.style.top = this.headerHeight + 'px';
        this.gridContainer.appendChild(this.rowHeaderCanvas);
        this.rowHeaderCtx = this.rowHeaderCanvas.getContext("2d");

        // 3. Cells canvas
        this.cellsCanvas = document.createElement('canvas');
        this.cellsCanvas.classList.add('cellsCanvas');
        this.cellsCanvas.style.left = this.headerWidth + 'px';
        this.cellsCanvas.style.top = this.headerHeight + 'px';
        this.gridContainer.appendChild(this.cellsCanvas);
        this.cellsCtx = this.cellsCanvas.getContext("2d");

        this.resizing = {
            type: null, // "row" or "col"
            index: -1,
            startPos: 0,
            startSize: 0
        };

        this.gridContainer.addEventListener('mousedown', this.onMouseDown.bind(this));
        this.gridContainer.addEventListener('mousemove', this.onMouseMove.bind(this));
        this.gridContainer.addEventListener('mouseup', this.onMouseUp.bind(this));

        // Scroll sync
        this.spacerContainer.addEventListener('scroll', () => {
            requestAnimationFrame(() => {
                this.renderGrid();
            })
        });

        window.addEventListener('resize', () => this.resizeCanvas());
        this.resizeCanvas();
    }

    colName(j) {
        let colName = '';
        let n = j;
        do {
            colName = String.fromCharCode(65 + (n % 26)) + colName;
            n = Math.floor(n / 26) - 1;
        } while (n >= 0);
        return colName;
    }

    resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        // Set sizes for each canvas
        // 1. Column header: width = visible grid width, height = headerHeight
        this.colHeaderCanvas.width = (width - this.headerWidth) * dpr;
        this.colHeaderCanvas.height = this.headerHeight * dpr;
        this.colHeaderCanvas.style.width = (width - this.headerWidth) + 'px';
        this.colHeaderCanvas.style.height = this.headerHeight + 'px';
        this.colHeaderCtx.setTransform(1, 0, 0, 1, 0, 0);
        this.colHeaderCtx.lineWidth = 1 / dpr;
        this.colHeaderCtx.scale(dpr, dpr);

        // 2. Row header: width = headerWidth, height = visible grid height
        this.rowHeaderCanvas.width = this.headerWidth * dpr;
        this.rowHeaderCanvas.height = (height - this.headerHeight) * dpr;
        this.rowHeaderCanvas.style.width = this.headerWidth + 'px';
        this.rowHeaderCanvas.style.height = (height - this.headerHeight) + 'px';
        this.rowHeaderCtx.setTransform(1, 0, 0, 1, 0, 0);
        this.rowHeaderCtx.lineWidth = 1 / dpr;
        this.rowHeaderCtx.scale(dpr, dpr);

        // 3. Cells canvas: width = visible grid width, height = visible grid height
        this.cellsCanvas.width = (width - this.headerWidth) * dpr;
        this.cellsCanvas.height = (height - this.headerHeight) * dpr;
        this.cellsCanvas.style.width = (width - this.headerWidth) + 'px';
        this.cellsCanvas.style.height = (height - this.headerHeight) + 'px';
        this.cellsCtx.setTransform(1, 0, 0, 1, 0, 0);
        this.cellsCtx.lineWidth = 1 / dpr;
        this.cellsCtx.scale(dpr, dpr);

        this.renderGrid();
    }

    onMouseDown(e) {
        const rect = this.gridContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Column resize zone detection
        let left = this.headerWidth - this.spacerContainer.scrollLeft;
        for (let j = 0; j < this.columns.length; j++) {
            const col = this.columns[j];
            if (Math.abs(x - (left + col.width)) < 5 && y < this.headerHeight) {
                this.resizing = {
                    type: 'col',
                    index: j,
                    startPos: x,
                    startSize: col.width
                };
                return;
            }
            left += col.width;
        }

        // Row resize zone detection
        let top = this.headerHeight - this.spacerContainer.scrollTop;
        for (let i = 0; i < this.rows.length; i++) {
            const row = this.rows[i];
            if (Math.abs(y - (top + row.height)) < 5 && x < this.headerWidth) {
                this.resizing = {
                    type: 'row',
                    index: i,
                    startPos: y,
                    startSize: row.height
                };
                return;
            }
            top += row.height;
        }
    }

    onMouseMove(e) {
        const rect = this.gridContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (x < this.headerWidth && y < this.headerHeight) return;

        if (this.resizing.type === null) {
            // Change cursor on hover
            let left = this.headerWidth - this.spacerContainer.scrollLeft;
            for (let j = 0; j < this.columns.length; j++) {
                const col = this.columns[j];
                if (Math.abs(x - (left + col.width)) < 5 && y < this.headerHeight) {
                    this.spacerContainer.style.cursor = 'col-resize';
                    return;
                }
                left += col.width;
            }

            let top = this.headerHeight - this.spacerContainer.scrollTop;
            for (let i = 0; i < this.rows.length; i++) {
                const row = this.rows[i];
                if (Math.abs(y - (top + row.height)) < 5 && x < this.headerWidth) {
                    this.spacerContainer.style.cursor = 'row-resize';
                    return;
                }
                top += row.height;
            }

            this.spacerContainer.style.cursor = 'default';
        }

        // Resize handling
        if (this.resizing.type === 'col') {
            const dx = x - this.resizing.startPos;
            const newWidth = Math.max(30, this.resizing.startSize + dx);
            this.virtualWidth += -this.columns[this.resizing.index].width + newWidth;
            this.columns[this.resizing.index].width = newWidth;
            this.updateSpacerSize();
            this.renderGrid();
        } else if (this.resizing.type === 'row') {
            const dy = y - this.resizing.startPos;
            const newHeight = Math.max(15, this.resizing.startSize + dy);
            this.virtualHeight += -this.rows[this.resizing.index].height + newHeight;
            this.rows[this.resizing.index].height = newHeight;
            this.updateSpacerSize();
            this.renderGrid();
        }
    }

    onMouseUp() {
        this.resizing.type = null;
    }

    updateSpacerSize() {
        this.spacer.style.width = this.virtualWidth + 'px';
        this.spacer.style.height = this.virtualHeight + 'px';
    }

    renderGrid() {
        // Get scroll positions
        const scrollX = this.spacerContainer.scrollLeft;
        const scrollY = this.spacerContainer.scrollTop;

        // Clear all canvases
        this.colHeaderCtx.clearRect(0, 0, this.colHeaderCanvas.width, this.colHeaderCanvas.height);
        this.rowHeaderCtx.clearRect(0, 0, this.rowHeaderCanvas.width, this.rowHeaderCanvas.height);
        this.cellsCtx.clearRect(0, 0, this.cellsCanvas.width, this.cellsCanvas.height);

        // Find visible columns/rows
        let startCol = 0, widthOfScrolledCols = 0;
        for (const col of this.columns) {
            if (widthOfScrolledCols + col.width > scrollX) break;
            widthOfScrolledCols += col.width;
            startCol++;
        }
        const endCol = Math.min(startCol + 20, this.totalCols);

        let startRow = 0, heightOfScrolledRows = 0;
        for (const row of this.rows) {
            if (heightOfScrolledRows + row.height > scrollY) break;
            heightOfScrolledRows += row.height;
            startRow++;
        }
        const endRow = Math.min(startRow + 40, this.totalRows);

        // column headers ctx
        this.colHeaderCtx.font = "12px Arial";
        this.colHeaderCtx.textAlign = 'center';
        this.colHeaderCtx.textBaseline = 'middle';
        this.colHeaderCtx.strokeStyle = '#e7e7e7';
        this.colHeaderCtx.fillStyle = '#f5f5f5';
        this.colHeaderCtx.fillRect(0, 0, this.colHeaderCanvas.width, this.headerHeight);

        // row headers ctx
        this.rowHeaderCtx.font = "12px Arial";
        this.rowHeaderCtx.textAlign = 'center';
        this.rowHeaderCtx.textBaseline = 'middle';
        this.rowHeaderCtx.strokeStyle = '#e7e7e7';
        this.rowHeaderCtx.fillStyle = '#f5f5f5';
        this.rowHeaderCtx.fillRect(0, 0, this.headerWidth, this.rowHeaderCanvas.height);

        // cells ctx
        this.cellsCtx.font = "12px Arial";
        this.cellsCtx.textAlign = 'start';
        this.cellsCtx.textBaseline = 'alphabetic';
        this.cellsCtx.strokeStyle = '#e7e7e7';

        this.drawCells(startRow, endRow, startCol, endCol, widthOfScrolledCols, heightOfScrolledRows, this.cellsCtx, scrollX, scrollY);
        this.drawColHeader(startCol, endCol, widthOfScrolledCols, this.colHeaderCtx, scrollX);
        this.drawRowHeader(startRow, endRow, heightOfScrolledRows, this.rowHeaderCtx, scrollY);
    }

    drawRowHeader(startRow, endRow, heightOfScrolledRows, ctx, scrollY) {
        this.drawLine(0, 0, this.rowHeaderCanvas.width, 0, ctx);

        let y = 0 + heightOfScrolledRows - scrollY;
        for (let i = startRow; i < endRow; i++) {
            const height = this.rows[i].height;
            const label = (i + 1).toString();
            ctx.fillStyle = '#000';
            ctx.fillText(label, this.headerWidth / 2, y + height / 2);

            y += height;
            this.drawLine(0, y, this.headerWidth, y, ctx);
            this.drawLine(0, y, this.cellsCanvas.width, y, this.cellsCtx);
        }
    }

    drawColHeader(startCol, endCol, widthOfScrolledCols, ctx, scrollX) {
        this.drawLine(0, 0, 0, this.colHeaderCanvas.height, ctx);

        let x = 0 + widthOfScrolledCols - scrollX;
        for (let j = startCol; j < endCol; j++) {
            const width = this.columns[j].width;
            const label = this.colName(j);
            ctx.fillStyle = '#000';
            ctx.fillText(label, x + width / 2, this.headerHeight / 2);

            x += width;
            this.drawLine(x, 0, x, this.headerHeight, ctx);
            this.drawLine(x, 0, x, this.cellsCanvas.height, this.cellsCtx);
        }
    }

    drawCells(startRow, endRow, startCol, endCol, widthOfScrolledCols, heightOfScrolledRows, ctx, scrollX, scrollY) {
        let y = 0 + heightOfScrolledRows - scrollY;

        for (let i = startRow; i < endRow; i++) {
            let x = 0 + widthOfScrolledCols - scrollX;

            for (let j = startCol; j < endCol; j++) {
                const cell = new Cell(this.rows[i], this.columns[j]);
                cell.drawCell(ctx, x, y, this.data.getCell(i, j));
                x += this.columns[j].width;
            }
            y += this.rows[i].height;
        }
    }

    drawLine(startX, startY, endX, endY, ctx) {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    }
}