function approximately_deep_equal(v1, v2) {
  for (var i = v1.length - 1; i >= 0; i--) {
    if (Math.abs(v1[i] - v2[i]) > 0.0001) {
      throw new Error(`${v1} is not equal to ${v2}`);
    }
  }
}

function test_project() {
  chai.expect(project([0, 0, 0], t([[1, 1, 1], [-1, 1, 1]]))).to.deep.equal([0, 0]);
  chai.expect(project([0, -1, 1], t([[1, 1, 1], [-1, 1, 1]]))).to.deep.equal([0, 0]);
  chai.expect(project([10, 0, -10], t([[1, 0, 0], [0, 0, 1]]))).to.deep.equal([10, -10]);
}

function test_computeTrackball() {
  console.assert(computeTrackball([10, 10], math.sqrt(200), [10, 0])[2] - 10 < 0.001);
  console.assert(computeTrackball([10, 10], 2, [12, 10])[2] - 2 < 0.001);
}

function test_rotate() {
  approximately_deep_equal(rotate([0, 0, 0], [1, 0, 0], Math.PI/2, [[0, 1, 0]])[0], [0, 0, 1]);
  approximately_deep_equal(rotate([0, 0, 0], [0, 1, 0], Math.PI/2, [[1, 0, 0]])[0], [0, 0, -1]);
  approximately_deep_equal(rotate([0, 0, 0], [0, 0, 1], Math.PI/2, [[1, 0, 0]])[0], [0, 1, 0]);
  approximately_deep_equal(rotate([0, 0, 0], [0, 1, 0], Math.PI/2, [[0, 1, 0]])[0], [0, 1, 0]);
}
