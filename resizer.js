export class Resizer {
    constructor(grid) {
        this.grid = grid;
        this.resizing = {
            type: null, // "row" or "col"
            index: -1,
            startPos: 0,
            startSize: 0
        };
    }

    onPointerDown(e) {
        const rect = this.grid.gridContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Column resize zone detection
        let left = this.grid.headerWidth - this.grid.spacerContainer.scrollLeft;
        for (let j = 0; j < this.grid.columns.length; j++) {
            const col = this.grid.columns[j];
            if (Math.abs(x - (left + col.width)) < 5 && y < this.grid.headerHeight) {
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
        let top = this.grid.headerHeight - this.grid.spacerContainer.scrollTop;
        for (let i = 0; i < this.grid.rows.length; i++) {
            const row = this.grid.rows[i];
            if (Math.abs(y - (top + row.height)) < 5 && x < this.grid.headerWidth) {
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

    onPointerMove(e) {
        const rect = this.grid.gridContainer.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (x < this.grid.headerWidth && y < this.grid.headerHeight) return;

        if (this.resizing.type === null) {
            // Change cursor on hover
            let left = this.grid.headerWidth - this.grid.spacerContainer.scrollLeft;
            for (let j = 0; j < this.grid.columns.length; j++) {
                const col = this.grid.columns[j];
                if (Math.abs(x - (left + col.width)) < 5 && y < this.grid.headerHeight) {
                    this.grid.spacerContainer.style.cursor = 'col-resize';
                    return;
                }
                left += col.width;
            }

            let top = this.grid.headerHeight - this.grid.spacerContainer.scrollTop;
            for (let i = 0; i < this.grid.rows.length; i++) {
                const row = this.grid.rows[i];
                if (Math.abs(y - (top + row.height)) < 5 && x < this.grid.headerWidth) {
                    this.grid.spacerContainer.style.cursor = 'row-resize';
                    return;
                }
                top += row.height;
            }

            this.grid.spacerContainer.style.cursor = 'default';
        }

        // Resize handling
        if (this.resizing.type === 'col') {
            const dx = x - this.resizing.startPos;
            const newWidth = Math.max(30, this.resizing.startSize + dx);
            this.grid.virtualWidth += -this.grid.columns[this.resizing.index].width + newWidth;
            this.grid.columns[this.resizing.index].width = newWidth;
            this.updateSpacerSize();
            this.grid.renderGrid();
        } else if (this.resizing.type === 'row') {
            const dy = y - this.resizing.startPos;
            const newHeight = Math.max(15, this.resizing.startSize + dy);
            this.grid.virtualHeight += -this.grid.rows[this.resizing.index].height + newHeight;
            this.grid.rows[this.resizing.index].height = newHeight;
            this.updateSpacerSize();
            this.grid.renderGrid();
        }
    }

    onPointerUp() {
        this.resizing.type = null;
    }

    updateSpacerSize() {
        this.grid.spacer.style.width = this.virtualWidth + 'px';
        this.grid.spacer.style.height = this.virtualHeight + 'px';
    }
}