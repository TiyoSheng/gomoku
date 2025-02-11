const chessScore = (playerNum, computerNum) => {
  // 机器进攻

  // 1.既有人类落子，又有机器落子，判分为0
  if (playerNum > 0 && computerNum > 0) {
    return 0;
  }
  // 2.全部为空没有棋子，判分为7(14)
  if (playerNum == 0 && computerNum == 0) {
    return 14;
  }
  // 3.机器落一子，判分为35(70)
  if (computerNum == 1) {
    return 70;
  }
  // 4.机器落两子，判分为800(1600)
  if (computerNum == 2) {
    return 1600;
  }
  // 5.机器落三子，判分为15000(30000)
  if (computerNum == 3) {
    return 30000;
  }
  // 6.机器落四子，判分为800000(1600000)
  if (computerNum == 4) {
    return 1600000;
  }

  // 机器防守

  // 7.玩家落一子，判分为15(30)
  if (playerNum == 1) {
    return 30;
  }
  // 8.玩家落两子，判分为400(800)
  if (playerNum == 2) {
    return 800;
  }
  // 9.玩家落三子，判分为1800(3600)
  if (playerNum == 3) {
    return 3600;
  }
  // 10.玩家落四子，判分为100000(200000)
  if (playerNum == 4) {
    return 200000;
  }

  return -1; //如果是其他情况，则出现错误，不会执行该段代码
}

const chessWidth = 15
let score = new Array(15).fill(0).map(() => new Array(15).fill(0))
let goalX = -1
let goalY = -1

export const ai = (chessPlace) => {
  // 初始化score评分组
  for (let i = 0; i < chessWidth; i++) {
    for (let j = 0; j < chessWidth; j++) {
      score[i][j] = 0;
    }
  }
  // 五元组中黑棋(玩家)数量
  let playerNum = 0;
  // 五元组中白棋(电脑)数量
  let computerNum = 0;
  // 五元组临时得分
  let tempScore = 0;
  // 最大得分
  let maxScore = -1;

  // 横向寻找
  for (let i = 0; i < chessWidth; i++) {
    for (let j = 0; j < chessWidth - 4; j++) {
      for (let k = j; k < j + 5; k++) {
        // 如果是玩家落得子
        if (chessPlace[k][i] == 1) {
          playerNum++;
        } else if (chessPlace[k][i] == 2) { //如果是电脑落子
          computerNum++;
        }
      }
      // 将每一个五元组中的黑棋和白棋个数传入评分表中
      tempScore = chessScore(playerNum, computerNum);
      // 为该五元组的每个位置添加分数
      for (let k = j; k < j + 5; k++) {
        score[k][i] += tempScore;
      }
      // 清空五元组中棋子数量和五元组临时得分
      playerNum = 0;
      computerNum = 0;
      tempScore = 0;
    }
  }

  // 纵向寻找
  for (let i = 0; i < chessWidth; i++) {
    for (let j = 0; j < chessWidth - 4; j++) {
      for (let k = 0; k < j + 5; k++) {
        if (chessPlace[i][k] == 1) {
          playerNum++;
        } else if (chessPlace[i][k] == 2) {
          computerNum++;
        }
      }
      tempScore = chessScore(playerNum, computerNum);
      for (let k = j; k < j + 5; k++) {
        score[i][k] += tempScore;
      }
      playerNum = 0;
      computerNum = 0;
      tempScore = 0;
    }
  }


  // 反斜线寻找

  // 反斜线上侧部分
  for (let i = chessWidth - 1; i >= 4; i--) {
    for (let k = i, j = 0; j < chessWidth && k >= 0; j++, k--) {
      let m = k; //x 14 13
      let n = j; //y 0  1
      for (; m > k - 5 && k - 5 >= -1; m--, n++) {
        if (chessPlace[m][n] == 1) {
          playerNum++;
        } else if (chessPlace[m][n] == 2) {
          computerNum++;
        }
      }
      // 注意在斜向判断时，可能出现构不成五元组（靠近棋盘的四个顶角）的情况，所以要忽略这种情况
      if (m == k - 5) {
        tempScore = chessScore(playerNum, computerNum);
        for (m = k, n = j; m > k - 5; m--, n++) {
          score[m][n] += tempScore;
        }
      }
      playerNum = 0;
      computerNum = 0;
      tempScore = 0;
    }
  }
  // 反斜线下侧部分
  for (let i = 1; i < 15; i++) {
    for (let k = i, j = chessWidth - 1; j >= 0 && k < 15; j--, k++) {
      let m = k; //y 1 
      let n = j; //x 14
      for (; m < k + 5 && k + 5 <= 15; m++, n--) {
        if (chessPlace[n][m] == 1) {
          playerNum++;
        } else if (chessPlace[n][m] == 2) {
          computerNum++;
        }
      }
      // 注意在斜向判断时，可能出现构不成五元组（靠近棋盘的四个顶角）的情况，所以要忽略这种情况
      if (m == k + 5) {
        tempScore = chessScore(playerNum, computerNum);
        for (m = k, n = j; m < k + 5; m++, n--) {
          score[n][m] += tempScore;
        }
      }
      playerNum = 0;
      computerNum = 0;
      tempScore = 0;
    }
  }

  // 正斜线寻找

  // 正斜线上侧部分
  for (let i = 0; i < chessWidth - 1; i++) {
    for (let k = i, j = 0; j < chessWidth && k < chessWidth; j++, k++) {
      let m = k;
      let n = j;
      for (; m < k + 5 && k + 5 <= chessWidth; m++, n++) {
        if (chessPlace[m][n] == 1) {
          playerNum++;
        } else if (chessPlace[m][n] == 2) {
          computerNum++;
        }
      }
      // 注意在斜向判断时，可能出现构不成五元组（靠近棋盘的四个顶角）的情况，所以要忽略这种情况
      if (m == k + 5) {
        tempScore = chessScore(playerNum, computerNum);
        for (m = k, n = j; m < k + 5; m++, n++) {
          score[m][n] += tempScore;
        }
      }
      playerNum = 0;
      computerNum = 0;
      tempScore = 0;
    }
  }

  // 正斜线下侧部分
  for (let i = 1; i < chessWidth - 4; i++) {
    for (let k = i, j = 0; j < chessWidth && k < chessWidth; j++, k++) {
      let m = k;
      let n = j;
      for (; m < k + 5 && k + 5 <= chessWidth; m++, n++) {
        if (chessPlace[n][m] == 1) {
          playerNum++;
        } else if (chessPlace[n][m] == 2) {
          computerNum++;
        }
      }
      // 注意在斜向判断时，可能出现构不成五元组（靠近棋盘的四个顶角）的情况，所以要忽略这种情况
      if (m == k + 5) {
        tempScore = chessScore(playerNum, computerNum);
        for (m = k, n = j; m < k + 5; m++, n++) {
          score[n][m] += tempScore;
        }
      }
      playerNum = 0;
      computerNum = 0;
      tempScore = 0;
    }
  }

  // 从空位置中找到得分最大的位置
  for (let i = 0; i < chessWidth; i++) {
    for (let j = 0; j < chessWidth; j++) {
      if (chessPlace[i][j] == 0 && score[i][j] > maxScore) {
        goalX = i;
        goalY = j;
        maxScore = score[i][j];
      }
    }
  }
  if (goalX != -1 && goalY != -1 && chessPlace[goalX][goalY] == 0) {
    console.log(goalX, goalY)
    return {
      x: goalX,
      y: goalY
    }
  }
}

