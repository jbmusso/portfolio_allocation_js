/**
 * @file Functions related to random weights portfolio.
 * @author Roman Rubsamen <roman.rubsamen@gmail.com>
 */

/* Start Wrapper private methods - Unit tests usage only */
/* End Wrapper private methods - Unit tests usage only */

/**
 * @function randomWeights
 *
 * @summary Compute the weights of a randomly generated portfolio.
 *
 * @description This function returns the weights w_1,...,w_n associated to a fully invested
 * and long-only random portfolio of n assets.
 *
 * Optionally, the following constraints can be added:
 * - Minimum number of assets to include in the portfolio
 * - Maximum number of assets to include in the portfolio
 * - Minimum weight of each asset to include in the portfolio
 * - Maximum weight of each asset to include in the portfolio
 * - Minimum exposure of the portfolio
 * - Maximum exposure of the portfolio
 *
 * This portfolio is not unique.
 *
 * Random portfolios have several applications in asset allocation, c.f. the first reference, as
 * well as in trading strategies evaluation, c.f. the second reference.
 *
 * To be noted that the algorithms used internally allow the random portfolios to be generated uniformly
 * among all the feasible portfolios.
 *
 * @see <a href="https://arxiv.org/abs/1008.3718">William T. Shaw, Monte Carlo Portfolio Optimization for General Investor Risk-Return Objectives and Arbitrary Return Distributions: a Solution for Long-only Portfolios</a>
 * @see <a href="https://doi.org/10.1007/3-540-36626-1_11">Burns P. (2007) Random Portfolios for Performance Measurement. In: Kontoghiorghes E.J., Gatu C. (eds) Optimisation, Econometric and Financial Analysis. Advances in Computational Management Science, vol 9. Springer, Berlin, Heidelberg</a>
 *
 * @param {number} nbAssets the number of assets in the universe, natural integer superior or equal to 1.
 * @param {object} opt optional parameters for the algorithm.
 * @param {number} opt.maxIter the maximum number of iterations of the algorithm, a strictly positive natural integer; defaults to 10000.
 * @param {number} opt.constraints.minNbAssets the minimum number of assets to include in the portfolio, an integer i satisfying 1 <= i <= nbAssets; defaults to 1.
 * @param {number} opt.constraints.maxNbAssets the maximum number of assets to include in the portfolio, an integer j satisfying i <= j <= nbAssets; defaults to nbAssets.
 * @param {Array.<number>} opt.constraints.minWeights an array of size nbAssets (l_i),i=1..nbAssets containing the minimum weights for the assets to include in the portfolio with 0 <= l_i <= u_i <= 1, i=1..nbAssets; defaults to an array made of zeros.
 * @param {Array.<number>} opt.constraints.maxWeights an array of size nbAssets (u_i),i=1..nbAssets containing the minimum weights for the assets to include in the portfolio with 0 <= l_i <= u_i <= 1, i=1..nbAssets; defaults to an array made of ones.
 * @param {number} opt.constraints.minExposure the minimum exposure of the portfolio expressed in percent, a strictly positive real number satisfying 0 < opt.constraints.minExposure <= opt.constraints.maxExposure <= 1; defaults to 1.
 * @param {number} opt.constraints.maxExposure the maximum exposure of the portfolio expressed in percent, a strictly positive real number satisfying 0 < opt.constraints.minExposure <= opt.constraints.maxExposure <= 1; defaults to 1.
 * @return {Array.<number>} the weights corresponding to a random portfolio, array of real numbers of length nbAssets.
 *
 * @example
 * randomWeights(5);
 * // ~[0, 0 0.33, 0.33, 0.33]
 *
 * randomWeights(5, { constraints: { minExposure: 0.4, maxExposure: 0.8, minWeights: [0.2,0.1,0.4,0.3,0], maxWeights: [0.9,0.8,0.4,0.7,1] } });
 * // ~[0, 0.10498858706451236, 0, 0.32412466798840733, 0.04620902965198814]
 */
self.randomWeights = function (nbAssets, opt) {
  // Initialize the options structure
  if (opt === undefined) {
    opt = {};
  }
  if (opt.constraints === undefined) {
    opt.constraints = {};
  }

  // ------

  // Decode options

  // The minimum number of assets to include in the portfolio
  var nbMinAssets = opt.constraints.minNbAssets;
  if (nbMinAssets === undefined) {
    nbMinAssets = 1;
  }

  // The maximum number of assets to include in the portfolio
  var nbMaxAssets = opt.constraints.maxNbAssets;
  if (nbMaxAssets === undefined) {
    nbMaxAssets = nbAssets;
  }

  // The minimum exposure of the portfolio
  var minExposure = opt.constraints.minExposure;
  if (minExposure === undefined) {
    minExposure = 1;
  }

  // The maximum exposure of the portfolio
  var maxExposure = opt.constraints.maxExposure;
  if (maxExposure === undefined) {
    maxExposure = 1;
  }

  // The maximum number of iterations
  var maxIter = opt.maxIter;
  if (maxIter === undefined) {
    maxIter = 10000;
  }

  // ------

  // Core process

  // Extract the mandatory minimum number of assets to include in the portfolio based
  // on optional lower bounds constraints.
  //
  // Extract the mandatory and free assets indexes based on optional lower bounds contraints.
  var nbMandatoryAssets = 0;
  var nbFreeAssets = nbAssets;
  if (opt.constraints.minWeights) {
    for (var i = 0; i < nbAssets; ++i) {
      if (opt.constraints.minWeights[i] > 0) {
        ++nbMandatoryAssets;
      }
    }

    var mandatoryAssetsIdx =
      typeof Uint32Array === 'function'
        ? new Uint32Array(nbMandatoryAssets)
        : new Array(nbMandatoryAssets);
    for (var i = 0, j = 0; i < nbAssets; ++i) {
      if (opt.constraints.minWeights[i] > 0) {
        mandatoryAssetsIdx[j++] = i + 1;
      }
    }
  }

  nbFreeAssets -= nbMandatoryAssets;
  var freeAssetsIdx =
    typeof Uint32Array === 'function'
      ? new Uint32Array(nbFreeAssets)
      : new Array(nbFreeAssets);
  for (var i = 0, j = 0; i < nbAssets; ++i) {
    if (
      opt.constraints.minWeights === undefined ||
      (opt.constraints.minWeights && opt.constraints.minWeights[i] === 0)
    ) {
      freeAssetsIdx[j++] = i + 1;
    }
  }

  // In case the mandatory minimum number of assets to include in the portfolio
  // is strictly greater than the desired maximum number of assets, throw an error.
  //
  // Otherwise, override the desired minimum number of assets.
  if (nbMandatoryAssets > nbMaxAssets) {
    throw new Error(
      'maximum number of assets not consistent with lower bounds contraints'
    );
  } else {
    nbMinAssets = Math.max(nbMinAssets, nbMandatoryAssets);
  }

  // Repeat steps 1 - 7 until the generated weights are feasible w.r.t. all the constraints:
  // - Cardinality constraints
  // - Minimum/maximum weights constraints
  // - Minimum/maximum exposure
  var nbIter = -1;
  while (true) {
    // Increment the number of iterations
    ++nbIter;

    // Check the number of iterations
    if (nbIter > maxIter) {
      throw new Error('maximum number of iterations reached');
    }

    // 1 - Generate the number of assets to include in the portfolio (uniform generation)
    var nbSelectedAssets =
      Math.floor(Math.random() * (nbMaxAssets - nbMinAssets + 1)) + nbMinAssets;
    var nbSelectedFreeAssets = nbSelectedAssets - nbMandatoryAssets;

    // 2 - Generate the indices of the assets to include in the portfolio (uniform generation);
    //     which is the union of the mandatory assets indices and of the selected free assets indices
    var selectedFreeAssetsIdx = new randomKSubsetIterator_(
      nbFreeAssets,
      nbSelectedFreeAssets,
      false
    ).next();
    for (var i = 0; i < nbSelectedFreeAssets; ++i) {
      var idx = selectedFreeAssetsIdx[i] - 1;
      selectedFreeAssetsIdx[i] = freeAssetsIdx[idx];
    }
    var selectedAssetsIdx =
      typeof Uint32Array === 'function'
        ? new Uint32Array(nbSelectedAssets)
        : new Array(nbSelectedAssets);
    for (var i = 0; i < nbMandatoryAssets; ++i) {
      selectedAssetsIdx[i] = mandatoryAssetsIdx[i];
    }
    for (var i = nbMandatoryAssets, j = 0; i < nbSelectedAssets; ++i, ++j) {
      selectedAssetsIdx[i] = selectedFreeAssetsIdx[j];
    }
    selectedAssetsIdx.sort(function (a, b) {
      // sort in increasing order
      return a - b;
    });

    // 3 - Generate the exposure of the portfolio (uniform generation)
    //
    //     From this step, the potential partial exposure of the portfolio is managed thanks
    //     to a slack asset variable and its associated exact weight constraint.
    var portfolioExposure =
      Math.random() * (maxExposure - minExposure) + minExposure;
    var nbSlackAssets = 0;
    if (portfolioExposure !== 1) {
      // A slack asset variable is added to the selected assets variables
      //
      // By convention, its index is nbSelectedAssets + 1
      nbSlackAssets = 1;

      // Definition of weights constraints for the nbSelectedAssets assets, plus the slack asset variable
      var lowerBounds =
        typeof Float64Array === 'function'
          ? new Float64Array(nbSelectedAssets + nbSlackAssets)
          : new Array(nbSelectedAssets + nbSlackAssets);
      var upperBounds =
        typeof Float64Array === 'function'
          ? new Float64Array(nbSelectedAssets + nbSlackAssets)
          : new Array(nbSelectedAssets + nbSlackAssets);

      // Default weights constraints for the selected assets
      for (var i = 0; i < nbSelectedAssets; ++i) {
        lowerBounds[i] = 0;
        upperBounds[i] = 1;
      }

      // Weight constraint (exact) for the slack asset variable
      var portfolioExposureWeightConstraint = 1 - portfolioExposure;
      lowerBounds[nbSelectedAssets] = portfolioExposureWeightConstraint;
      upperBounds[nbSelectedAssets] = portfolioExposureWeightConstraint;
    }

    // 4 - In case minimum/maximum weights constraints are provided, automatically map
    //     these constraints to the generated assets.
    if (opt.constraints.minWeights) {
      // In case default lower bounds contraints have already been set in step 3 above
      // due to a partial investment constraint, the lowerBounds variable must not be overriden.
      //
      // Otherwise, there is no slack asset variable to manage.
      if (portfolioExposure === 1) {
        var lowerBounds =
          typeof Float64Array === 'function'
            ? new Float64Array(nbSelectedAssets)
            : new Array(nbSelectedAssets);
      }

      // Weights constraints for the selected assets
      for (var i = 0; i < nbSelectedAssets; ++i) {
        lowerBounds[i] = opt.constraints.minWeights[selectedAssetsIdx[i] - 1];
      }

      // Weight constraint for the potential slack asset variable has already been
      // set in step 3 above
    }
    if (opt.constraints.maxWeights) {
      // In case default upper bounds contraints have already been set in step 3 above
      // due to a partial investment constraint, the upperBounds variable must not be overriden.
      //
      // Otherwise, there is no slack asset variable to manage.
      if (portfolioExposure === 1) {
        var upperBounds =
          typeof Float64Array === 'function'
            ? new Float64Array(nbSelectedAssets)
            : new Array(nbSelectedAssets);
      }

      // Weights constraints for the selected assets
      for (var i = 0; i < nbSelectedAssets; ++i) {
        upperBounds[i] = opt.constraints.maxWeights[selectedAssetsIdx[i] - 1];
      }

      // Weight constraint for the potential slack asset variable has already been
      // set in step 3 above
    }

    // 5 - Test for the feasibility of the generated assets w.r.t. the optional lower and upper bounds
    try {
      var sumBounds = simplexEmptinessCheck_(
        nbSelectedAssets + nbSlackAssets,
        lowerBounds,
        upperBounds
      );
    } catch (e) {
      // In case the check above results in an exception, it means the generated assets are not feasible.
      //
      // So, generate a whole new set of number of assets / assets indices.
      continue;
    }

    // 6 - Generate the weights of the assets to include in the portfolio (uniform generation)
    var selectedAssetsWeights = new simplexRandomSampler_(
      nbSelectedAssets + nbSlackAssets,
      lowerBounds,
      upperBounds
    ).sample();

    // 7 - Test for the feasibility of the generated weights w.r.t. the cardinality constraint,
    //     i.e., exactly the first nbSelectedAssets assets weights must be non zero.
    for (var i = 0; i < nbSelectedAssets; ++i) {
      // In case of a zero weight, generate a whole new set of number of assets / assets indices
      if (selectedAssetsWeights[i] == 0) {
        continue;
      }
    }

    // At this stage, the generated weights are feasible w.r.t. all constraints,
    // so that the process can be stopped.
    break;
  }

  // Compute the final weights vector:
  // - The weights associated to assets not included in the portfolio at step 2 are set to zero
  // - The weights associated to assets included in the portfolio at step 2 are set to their values generated at step 5
  var weights = Matrix_.zeros(nbAssets, 1);
  for (var i = 0; i < nbSelectedAssets; ++i) {
    // Extract included assets information
    var assetIdx = selectedAssetsIdx[i];
    var assetWeight = selectedAssetsWeights[i];

    // Update the weights vector
    weights.setValueAt(assetIdx, 1, assetWeight);
  }

  // Return the computed weights
  return weights.toArray();
};
