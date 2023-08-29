// 根据map跟player 计算最佳坐标
const ai = (map, player) => {
  let bestX = 0
  let bestY = 0
  let bestScore = 0
  let score = 0
  for (let i = 0; i < m; i++) {
    for (let j = 0; j < m; j++) {
      if (map[i][j] == 0) {
        score = getScore(map, i, j, player)
        if (score > bestScore) {
          bestScore = score
          bestX = i
          bestY = j
        }
      }
    }
  }
  return { x: bestX, y: bestY }
}

const getScore = (map, x, y, player) => {
  let score = 0
  let tempMap = JSON.parse(JSON.stringify(map))
  tempMap[x][y] = player
  score += getScoreByDirection(tempMap, x, y, 1, 0, player)
  score += getScoreByDirection(tempMap, x, y, 0, 1, player)
  score += getScoreByDirection(tempMap, x, y, 1, 1, player)
  score += getScoreByDirection(tempMap, x, y, 1, -1, player)
  return score
}

const getScoreByDirection = (map, x, y, directionX, directionY, player) => {
  let score = 0
  let count = 0
  let block = 0
  let empty = 0
  let tempX = x
  let tempY = y
  while (tempX >= 0 && tempX < m && tempY >= 0 && tempY < m && map[tempX][tempY] == player) {
    count++
    tempX += directionX
    tempY += directionY
  }
  if (tempX >= 0 && tempX < m && tempY >= 0 && tempY < m && map[tempX][tempY] == 0) {
    empty++
  } else {
    block++
  }
  tempX = x - directionX
  tempY = y - directionY
  while (tempX >= 0 && tempX < m && tempY >= 0 && tempY < m && map[tempX][tempY] == player) {
    count++
    tempX -= directionX
    tempY -= directionY
  }
  if (tempX >= 0 && tempX < m && tempY >= 0 && tempY < m && map[tempX][tempY] == 0) {
    empty++
  } else {
    block++
  }
  score += getScoreByCount(count, block, empty)
  return score
}

const getScoreByCount = (count, block, empty) => {
  let score = 0
  if (count >= 5) {
    score += 100000
  } else if (block == 0) {
    switch (count) {
      case 1:
        score += 10
        break;
      case 2:
        score += 100
        break;
      case 3:
        score += 1000
        break;
      case 4:
        score += 10000
        break;
    }
  } else if (block == 1) {
    switch (count) {
      case 1:
        score += 1
        break;
      case 2:
        score += 10
        break;
      case 3:
        score += 100
        break;
      case 4:
        score += 1000
        break;
    }
  } else if (block == 2) {
    switch (count) {
      case 1:
        score += 0.1
        break;
      case 2:
        score += 1
        break;
      case 3:
        score += 10
        break;
      case 4:
        score += 100
        break;
    }
  } else if (block == 3) {
    switch (count) {
      case 1:
        score += 0.01
        break;
      case 2:
        score += 0.1
        break;
      case 3:
        score += 1
        break;
      case 4:
        score += 10
        break;
    }
  } else if (block == 4) {
    switch (count) {
      case 1:
        score += 0.001
        break;
      case 2:
        score += 0.01
        break;
      case 3:
        score += 0.1
        break;
      case 4:
        score += 1
        break;
    }
  }
  return score
}
