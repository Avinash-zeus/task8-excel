export class Selector {
    constructor(grid) {
        this.grid = grid;
        this.selection = {
            startRow: null,
            endRow: null,
            startCol: null,
            endCol: null,
            isSelecting: false
        };
    }

    onPointerDown(e) {
        const rect = this.grid.gridContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (x < this.grid.headerWidth || y < this.grid.headerHeight) return;

        // Determine the starting row and column for selection
        this.selection.startRow = this.selection.endRow = this.getRowIndex(y);
        this.selection.startCol = this.selection.endCol = this.getColIndex(x);
        this.selection.isSelecting = true;

        this.grid.renderGrid();
    }

    onPointerMove(e) {
        if (!this.selection.isSelecting) return;

        const rect = this.grid.gridContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Update the end row and column based on pointer position
        this.selection.endRow = this.getRowIndex(y);
        this.selection.endCol = this.getColIndex(x);

        this.grid.renderGrid();
    }

    onPointerUp() {
        this.selection.isSelecting = false;
    }

    getRowIndex(y) {
        let top = this.grid.headerHeight - this.grid.spacerContainer.scrollTop;

        for (let i = 0; i < this.grid.rows.length; i++) {
            top += this.grid.rows[i].height;
            if (y < top) return i;
        }

        return this.grid.rows.length - 1; // Last row if below all
    }

    getColIndex(x) {
        let left = this.grid.headerWidth - this.grid.spacerContainer.scrollLeft;

        for (let j = 0; j < this.grid.columns.length; j++) {
            left += this.grid.columns[j].width;
            if (x < left) return j;
        }

        return this.grid.columns.length - 1; // Last column if beyond all
    }
}