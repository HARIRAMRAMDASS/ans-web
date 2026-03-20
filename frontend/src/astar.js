export function aStar(start, dest, mapWidth, mapHeight, gridSize, obstacles) {
  // Snap coordinates to grid
  const snap = (val) => Math.round(val / gridSize) * gridSize;

  class Node {
    constructor(x, y, g, h, parent) {
      this.x = x;
      this.y = y;
      this.g = g;
      this.h = h;
      this.f = g + h;
      this.parent = parent;
    }
  }

  const heuristic = (x1, y1, x2, y2) => Math.abs(x1 - x2) + Math.abs(y1 - y2);

  const startX = snap(start.x);
  const startY = snap(start.y);
  const destX = snap(dest.x);
  const destY = snap(dest.y);

  let openList = [];
  let closedList = new Set();

  openList.push(new Node(startX, startY, 0, heuristic(startX, startY, destX, destY), null));

  // Basic AABB collision detection
  const isObstacle = (x, y) => {
    return obstacles.some(obs => {
      // expand obstacle width/height for clearance
      const margin = gridSize; 
      return x >= obs.x - margin && x <= obs.x + obs.w + margin &&
             y >= obs.y - margin && y <= obs.y + obs.h + margin;
    });
  };

  let maxIterations = 5000;
  let iterations = 0;

  while (openList.length > 0 && iterations < maxIterations) {
    iterations++;
    // Sort to find the node with the lowest f value
    openList.sort((a, b) => a.f - b.f);
    let currentNode = openList.shift();

    // Reached destination?
    if (Math.abs(currentNode.x - destX) <= gridSize && Math.abs(currentNode.y - destY) <= gridSize) {
      let path = [];
      let temp = currentNode;
      // Add exact destination as last point
      path.push({ x: dest.x, y: dest.y });
      while (temp) {
        path.push({ x: temp.x, y: temp.y });
        temp = temp.parent;
      }
      return path.reverse();
    }

    closedList.add(`${currentNode.x},${currentNode.y}`);

    // Generate children
    const dirs = [
      { dx: 0, dy: -gridSize },
      { dx: 0, dy: gridSize },
      { dx: -gridSize, dy: 0 },
      { dx: gridSize, dy: 0 },
      { dx: -gridSize, dy: -gridSize }, // Diagonals
      { dx: gridSize, dy: -gridSize },
      { dx: -gridSize, dy: gridSize },
      { dx: gridSize, dy: gridSize }
    ];

    for (let dir of dirs) {
      let nx = currentNode.x + dir.dx;
      let ny = currentNode.y + dir.dy;

      // Bounds check
      if (nx < 0 || ny < 0 || nx > mapWidth || ny > mapHeight) continue;

      if (closedList.has(`${nx},${ny}`)) continue;
      if (isObstacle(nx, ny)) continue;

      let gCost = (dir.dx !== 0 && dir.dy !== 0) ? gridSize * 1.414 : gridSize;
      let g = currentNode.g + gCost;
      let h = heuristic(nx, ny, destX, destY);

      let existingNode = openList.find(n => n.x === nx && n.y === ny);
      if (existingNode && g >= existingNode.g) {
        continue;
      }

      if (!existingNode) {
        openList.push(new Node(nx, ny, g, h, currentNode));
      } else {
        existingNode.g = g;
        existingNode.f = g + h;
        existingNode.parent = currentNode;
      }
    }
  }

  // Not found or exceeded max iterations
  return [];
}
