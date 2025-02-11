const m = 15;
export const isPlayerWon = (map, cell) => {
  let mp = JSON.parse(JSON.stringify(map));
  let result = [];
  let k = 5;
  const one = () => {
    items = 1;
    row = cell.row;
    while (mp[cell.column][row] === cell.player && row > 0) {
      row--;
      if (mp[cell.column][row] === cell.player) {
        items++
        result.push([cell.column, row])
      };
    }

    row = cell.row;
    while (mp[cell.column][row] === cell.player && row < m - 1) {
      row++;
      if (mp[cell.column][row] === cell.player) {
        items++
        result.push([cell.column, row])
      };
    }

    return items >= k ? true : false;
  };

  const two = () => {
    items = 1;

    column = cell.column;
    while (mp[column][cell.row] === cell.player && column > 0) {
      column--;
      if (mp[column][cell.row] === cell.player) {
        items++
        result.push([column, cell.row])
      };
    }

    column = cell.column;
    while (mp[column][cell.row] === cell.player && column < m - 1) {
      column++;
      if (mp[column][cell.row] === cell.player) {
        items++
        result.push([column, cell.row])
      };
    }

    return items >= k ? true : false;
  };

  const three = () => {
    items = 1;

    row = cell.row;
    column = cell.column;
    while (mp[column][row] === cell.player && row > 0 && column > 0) {
      row++;
      column--;
      if (mp[column][row] === cell.player) {
        items++
        result.push([column, row])
      };
    }

    row = cell.row;
    column = cell.column;
    while (mp[column][row] === cell.player && row < m - 1 && column < m - 1) {
      row--;
      column++;
      if (mp[column][row] === cell.player) {
        items++
        result.push([column, row])
      };
    }

    return items >= k ? true : false;
  };

  const four = () => {
    items = 1;

    row = cell.row;
    column = cell.column;
    while (mp[column][row] === cell.player && row > 0 && column > 0) {
      row--;
      column--;
      if (mp[column][row] === cell.player) {
        items++
        result.push([column, row])
      };
    }

    row = cell.row;
    column = cell.column;
    while (mp[column][row] === cell.player && row < m - 1 && column < m - 1) {
      row++;
      column++;
      if (mp[column][row] === cell.player) {
        items++
        result.push([column, row])
      };
    }

    return items >= k ? true : false;
  };

  let row,
    column,
    items,
    won = one() || two() || three() || four();
  if (won) {
    result.unshift([cell.column, cell.row])
  } else {
    result = []
  }
  return result;
};
