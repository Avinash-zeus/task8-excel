import Cell from "./cell.js";
import Row from "./row.js";
import Column from './column.js';
import { Resizer } from "./resizer.js";
import { Selector } from "./selector.js";

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
        this.virtualWidth = totalCols * this.columns[0].width + 50;
        this.virtualHeight = totalRows * this.rows[0].height + 30;
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

        this.resizer = new Resizer(this);

        this.gridContainer.addEventListener('pointerdown', this.onPointerDown.bind(this));
        this.gridContainer.addEventListener('pointermove', this.onPointerMove.bind(this));
        this.gridContainer.addEventListener('pointerup', this.onPointerUp.bind(this));

        this.selector = new Selector(this);

        // Inut box to edit cell
        this.editInput = document.createElement('input');
        this.editInput.classList.add('editInput');
        this.editInput.type = 'text';
        this.gridContainer.addEventListener('dblclick', this.onDblClick.bind(this));

        // Scroll sync
        this.spacerContainer.addEventListener('scroll', () => {
            requestAnimationFrame(() => {
                this.renderGrid();
                this.updateEditInputPosition();
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

    onPointerDown(e) {
        this.selector.onPointerDown(e);
        this.resizer.onPointerDown(e);
    }

    onPointerMove(e) {
        this.selector.onPointerMove(e);
        this.resizer.onPointerMove(e);
    }

    onPointerUp() {
        this.selector.onPointerUp();
        this.resizer.onPointerUp();
    }

    onDblClick(e) {
        this.startCellEdit(this.selector.selection.startRow, this.selector.selection.startCol);
    }

    startCellEdit(row, col) {
        this.editInput.style.display = '';
        this.editingCell = { row, col };

        const value = this.data.getCell(row, col) ?? "";
        this.editInput.value = value;

        this.gridContainer.appendChild(this.editInput);
        this.updateEditInputPosition();
        this.editInput.focus();

        this.editInput.addEventListener('blur', () => this.commitCellEdit());
        this.editInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.commitCellEdit();
            } else if (e.key === 'Escape') {
                this.cancelCellEdit();
            }
        });
    }

    commitCellEdit() {
        if (!this.editingCell) return;
        const { row, col } = this.editingCell;
        this.data.setCell(row, col, this.editInput.value);
        this.editInput.style.display = 'none';
        this.renderGrid();
    }

    cancelCellEdit() {
        if (this.editingCell) {
            this.editInput.style.display = 'none';
        }
    }

    updateEditInputPosition() {
        if (!this.editingCell) return;
        const { row, col } = this.editingCell;

        const scrollX = this.spacerContainer.scrollLeft;
        const scrollY = this.spacerContainer.scrollTop;

        let cellX = 0, cellY = 0;
        for (let j = 0; j < col; j++) cellX += this.columns[j].width;
        for (let i = 0; i < row; i++) cellY += this.rows[i].height;
        cellX -= scrollX;
        cellY -= scrollY;

        let left = this.headerWidth + cellX;
        let top = this.headerHeight + cellY;
        let width = this.columns[col].width;
        let height = this.rows[row].height;

        // Get grid container visible area
        const containerWidth = this.gridContainer.clientWidth;
        const containerHeight = this.gridContainer.clientHeight;

        // Clamp left/top so input never goes outside the grid container
        if (left < this.headerWidth) {
            width -= (this.headerWidth - left);
            left = this.headerWidth;
        }
        if (top < this.headerHeight) {
            height -= (this.headerHeight - top);
            top = this.headerHeight;
        }

        // Clamp right/bottom so input never overflows grid container
        if (left + width > containerWidth) {
            width = Math.max(0, containerWidth - left);
        }
        if (top + height > containerHeight) {
            height = Math.max(0, containerHeight - top);
        }

        // Hide if completely out of view
        if (width <= 0 || height <= 0) {
            this.editInput.style.display = 'none';
            return;
        } else {
            this.editInput.style.display = '';
            this.editInput.focus();
        }

        this.editInput.style.left = left + 2 + 'px';
        this.editInput.style.top = top + 2 + 'px';
        this.editInput.style.width = width - 4 + 'px';
        this.editInput.style.height = height - 4 + 'px';
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
        this.drawSelectionBox();
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
            this.drawLine(0, y + 0.5, this.headerWidth, y + 0.5, ctx);
            this.drawLine(0, y + 0.5, this.cellsCanvas.width, y + 0.5, this.cellsCtx);
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
            this.drawLine(x + 0.5, 0, x + 0.5, this.headerHeight, ctx);
            this.drawLine(x + 0.5, 0, x + 0.5, this.cellsCanvas.height, this.cellsCtx);
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

    drawSelectionBox() {
        const selection = this.selector.selection;
        if (selection.startRow === null) return;

        const scrollX = this.spacerContainer.scrollLeft;
        const scrollY = this.spacerContainer.scrollTop;

        const startRow = Math.min(selection.startRow, selection.endRow);
        const endRow = Math.max(selection.startRow, selection.endRow);
        const startCol = Math.min(selection.startCol, selection.endCol);
        const endCol = Math.max(selection.startCol, selection.endCol);

        // Calculate top-left and bottom-right cell positions
        let left = 0, top = 0;
        for (let j = 0; j < startCol; j++) left += this.columns[j].width;
        for (let i = 0; i < startRow; i++) top += this.rows[i].height;
        let right = left;
        for (let j = startCol; j <= endCol; j++) right += this.columns[j].width;
        let bottom = top;
        for (let i = startRow; i <= endRow; i++) bottom += this.rows[i].height;

        // Adjust for scroll and header
        left = left - scrollX;
        top = top - scrollY;

        // Draw rectangle on cells canvas
        this.cellsCtx.save();
        this.cellsCtx.strokeStyle = '#137e43';
        this.cellsCtx.lineWidth = 2;
        this.cellsCtx.strokeRect(left, top, right - left, bottom - top);
        this.cellsCtx.restore();
    }

    drawLine(startX, startY, endX, endY, ctx) {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    }
}