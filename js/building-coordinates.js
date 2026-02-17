/**
 * Building Coordinates Data
 * 
 * Shared building coordinate data used across multiple map visualization files.
 * This file contains the corner coordinates, configuration, and center calculations
 * for all campus buildings.
 */

// Building coordinates mapping
const buildingCoordinates = {
    'LAFAYE': {  // U/D, L/R
                // Further left is 
        corners: [
            [44.4783326, -73.1986372],
            [44.4775246, -73.1985255],
            [44.4775537, -73.1981747],
            [44.4783574, -73.1982984],
            
        ],
        // Building-specific configuration
        config: {
            rotation: -6,        // Rotation angle in degrees
            gridCols: 8,         // Number of columns for classroom grid
            padding: 0.3         // Padding percentage (30% from edges)
        },
        // Calculate center point from corners
        get center() {
            const lats = this.corners.map(c => c[0]);
            const lngs = this.corners.map(c => c[1]);
            return {
                lat: (Math.min(...lats) + Math.max(...lats)) / 2,
                lng: (Math.min(...lngs) + Math.max(...lngs)) / 2
            };
        }
    },

    'AIKEN': {
        corners: [
            [44.47597, -73.195399],   // NW
            [44.47597, -73.1951],    // NE
            [44.4758623, -73.1951],  // SE
            [44.4758597, -73.195399],  // SW
        ],
        
        config: {
            rotation: 0,
            gridCols: 3,
            padding: 0.3
        },
    },

    'JEFFRD': {
        corners: [[44.4755743, -73.194024],  // NW
        [44.4754824, -73.1937439],    // NE
        [44.4751534, -73.1939514],   // SE
        [44.4752473, -73.1942352]   // SW
        ],
        config: {
            rotation: 25,
            gridCols: 3,
            padding: 0.3
        },
    },

    'BLLNGS': {
        corners: [
            [44.4802999, -73.1989],  // NW
            [44.4803126, -73.1988639],    // NE
            [44.4801614, -73.1988329],   // SE
            [44.4801475, -73.1989]   // SW
        ],
        config: {
            rotation: 0,
            gridCols: 1,
            padding: 0.3
        }
    },

    'L/L-A': {
        corners: [
            [44.473485, -73.194313],  // NW
            [44.473485, -73.19416],    // NE
            [44.4733591, -73.19416],   // SE
            [44.4733608, -73.194313]   // SW
        ],
        config: {
            rotation: 0,
            gridCols: 2,
            padding: 0.3
        }
    },

    'PLB': {
        corners: [
            [44.4771964, -73.19479],  // NW
            [44.4771972, -73.1946677],    // NE
            [44.4767183, -73.1945845],   // SE
            [44.4767026, -73.1947]   // SW
        ],
        config: {
            rotation: -6,
            gridCols: 1,
            padding: 0.3
        }
    },

    'ML SCI': {
        corners: [
            [44.4770436, -73.1956828],  // NW
            [44.4770603, -73.1954961],    // NE
            [44.4764931, -73.19549992],   // SE
            [44.4764774, -73.1955803]   // SW
        ],
        config: {
            rotation: -6,
            gridCols: 2,
            padding: 0.3
        }
    },

    'WATERM': {
        corners: [
            [44.4785185, -73.201282],  // NW
            [44.4785032, -73.2009602],    // NE
            [44.4780197, -73.2009848],   // SE
            [44.478033, -73.2013048]   // SW
        ],
        config: {
            rotation: 3,
            gridCols: 3,
            padding: 0.3
        }
    },

    'MORRIL': {
        corners: [
            [44.476715, -73.1984686],  // NW
            [44.476715, -73.1983426],    // NE
            [44.4765061, -73.1983012],   // SE
            [44.4764966, -73.1984284]   // SW
        ],
        config: {
            rotation: -6,
            gridCols: 1,
            padding: 0.3
        }
    },

    'L/L-B': {
        corners: [
            [44.47393, -73.1944047],  // NW
            [44.47393, -73.194214],    // NE
            [44.4738672, -73.1941867],   // SE
            [44.4738521, -73.1943831]   // SW
        ],
        config: {
            rotation: 0,
            gridCols: 2,
            padding: 0.3
        }
    },

    'GIVN E': {
        corners: [
            [44.4779676, -73.1938167],  // NW
            [44.4779861, -73.1935513],    // NE
            [44.4778616, -73.1935308],   // SE
            [44.4778449, -73.1937681]   // SW
        ],
        config: {
            rotation: -6,
            gridCols: 2,
            padding: 0.3
        }
    },

    'GIVN C': {
        corners: [
            
            [44.4777519, -73.1937492],  // NW
            [44.4777697, -73.193522],    // NE
            [44.477676, -73.1934958],   // SE
            [44.4776574, -73.1937276]   // SW
        ],
        config: {
            rotation: -6,
            gridCols: 1,
            padding: 0.3
        }
    },

    'WILLMS': {
        corners: [
            
            [44.4788211, -73.1990503],  // NW
            [44.4788444, -73.1988615],    // NE
            [44.4783140, -73.1987737],   // SE
            [44.4782955, -73.1989622],   // SW
            [44.4788146, -73.1990503],   // SW
        ],
        config: {
            rotation: -6,
            gridCols: 2,
            padding: 0.3
        }
    },

    'FLEMIN': {
        corners: [
            [44.4800047, -73.1972216],  // NW   
            [44.4800170, -73.1970884],    // NE
            [44.4799433, -73.1970771],   // SE
            [44.4799311, -73.1972073],   // SW
        ],
        config: {
            rotation: -6,
            gridCols: 2,
            padding: 0.3
        }
    },

    'COHEN': {
        corners: [
            [44.4804172, -73.2031],  // NW
            [44.4804255, -73.20259],    // NE
            [44.4802, -73.2027484],   // SE
            [44.4802, -73.2031],   // SW
                    ],
        config: {
            rotation: 0,
            gridCols: 4,
            padding: 0.3
        }
    },

    'HARRIS': {
        corners: [
            [44.4717667, -73.1938416],
            [44.4716976, -73.1938631],
            [44.4716910, -73.1937056],
            [44.4718107, -73.1937859],
            
        ],
        config: {
            rotation: -6,
            gridCols: 2,
            padding: 0.3
        }
    },

    'PERKIN': {
        corners: [
            [44.4798036, -73.1980158],
            [44.4797223, -73.1979950],
            [44.4797629, -73.1975675],
            [44.4798410, -73.1975823],
        ],
        config: {
            rotation: -6,
            gridCols: 1,
            padding: 0.3
        }
    },

    'TERRIL': {
        corners: [
            [44.4761757, -73.1963110],
            [44.4760946, -73.1962954],
            [44.4761310, -73.1958260],
            [44.4762119, -73.1958426],

        ],
        config: {
            rotation: -6,
            gridCols: 1,
            padding: 0.3
        }
    },

    'ROWELL': {
        corners: [
            [44.4778705, -73.1948774],
            [44.4775482, -73.1948243],
            [44.4775887, -73.1942762],
            [44.4779189, -73.1943433],
            
            
        ],
        config: {
            rotation: -6,
            gridCols: 4,
            padding: 0.3
        }
    },

    'KALKIN': {
        corners: [
            [44.4794648, -73.1977390],
            [44.4791553, -73.1976921],
            [44.4791838, -73.1973536],
            [44.4794920, -73.1974091],

        ],
        config: {
            rotation: -6,
            gridCols: 3,
            padding: 0.3
        }

    },

    'VOTEY': {
        corners: [
            [44.4795796, -73.1983439],
            [44.4790335, -73.1982504],
            [44.4790619, -73.1979025],
            [44.4796111, -73.1979980],
            
        ],
        config: {
            rotation: -6,
            gridCols: 6,
            padding: 0.3
        }
    },

    'STAFFO': {
        corners: [
            [44.4765140, -73.1944828],
            [44.4762392, -73.1944322],
            [44.4762562, -73.1942481],
            [44.4765299, -73.1943016],
            
            
        ],
        config: {
            rotation: -6,
            gridCols: 3,
            padding: 0.3
        }
    },

    'OMANEX': {
        corners: [
            [44.4778601, -73.1989535],
            [44.4777428, -73.1989287],
            [44.4777782, -73.1986012],
            [44.4778922, -73.1986234],
        ],
        config: {
            rotation: -6,
            gridCols: 2,
            padding: 0.3
        }
    },

    'OLDMIL': {
        corners: [
            [44.4780237, -73.1988],
            [44.4779414, -73.1989850],
            [44.4779535, -73.1988],
            [44.4780329, -73.1988],
            
        ],
        config: {
            rotation: -6,
            gridCols: 3,
            padding: 0.3
        }
    },

    'DISCOV': {
        corners: [            
            [44.4787818, -73.1982659],
            [44.4782228, -73.1981752],
            [44.4782508, -73.1977740],
            [44.4788184, -73.1978591],


        ],
        config: {
            rotation: -6,
            gridCols: 6,
            padding: 0.3
        }
    },

    'INNOV': {
        corners: [            
            [44.4785513, -73.1976819],
            [44.4781970, -73.1976202],
            [44.4782128, -73.1974045],
            [44.4785691, -73.1974669],
            
            
        ],
        config: {
            rotation: -6,
            gridCols: 4,
            padding: 0.3
        }
    },

    'IFSHIN': {
        corners: [
            [44.4795511, -73.1977515],
            [44.4794863, -73.1977350],
            [44.4795023, -73.1975381],
            [44.4795682, -73.1975543],

        ],
        config: {
            rotation: -6,
            gridCols: 1,
            padding: 0.3
        }
    },

    'L/L CM': {
        corners: [
            [44.4737660, -73.1948873],
            [44.4736284, -73.1948555],
            [44.4736432, -73.1947012],
            [44.4737834, -73.1947314],
        ],
        config: {
            rotation: -6,
            gridCols: 2,
            padding: 0.3
        }
    },

    'L/L-D': {
        corners: [
            [44.4735371, -73.1952654],
            [44.4734712, -73.1952510],
            [44.4734781, -73.1951552],
            [44.4735462, -73.1951673],

        ],
        config: {
            rotation: -6,
            gridCols: 2,
            padding: 0.3
        }
    },

    'MARSH': {
        corners: [
            [44.4728394, -73.1935773],
            [44.4727829, -73.1935612],
            [44.4727886, -73.1934781],
            [44.4728470, -73.1934942],

        ],
        config: {
            rotation: -6,
            gridCols: 2,
            padding: 0.3
        }
    },

    'RT THR': {
        corners: [
            [44.4774534, -73.1983893],
            [44.4774684, -73.1981969],
            [44.4773711, -73.1981774],
            [44.4773558, -73.1983691],

        ],
        config: {
            rotation: -6,
            gridCols: 2,
            padding: 0.3
        }
    },

    '70S WL': {
        corners: [
            [44.4787183, -73.2028294],
            [44.4787071, -73.2028267],
            [44.4787081, -73.2027507],
            [44.4787193, -73.2027543],
            
        ],
        config: {
            rotation: 0,
            gridCols: 2,
            padding: 0.3
        }
    },

    'ALLEN': {
        corners: [
            [44.4761473, -73.2004926],
            [44.4761024, -73.2004907],
            [44.4761027, -73.2004153],
            [44.4761481, -73.2004152],
            
        ],
        config: {
            rotation: 0,
            gridCols: 2,
            padding: 0.3
        }
    },

    'DELEHA': {
        corners: [
            [44.4828630, -73.1943482],
            [44.4827176, -73.1943388],
            [44.4827204, -73.1941675],
            [44.4828630, -73.1941747],
        ],
        config: {
            rotation: 0,
            gridCols: 2,
            padding: 0.3
        }
    },


    'DEWEY': {
        corners: [
            [44.4811154, -73.2004701],
            [44.4809860, -73.2005110],
            [44.4809100, -73.2000543],
            [44.4810407, -73.2000147],
                                ],
        config: {
            rotation: 13,
            gridCols: 2,
            padding: 0.3
        }
    },

    'HSRF': {
        corners: [
            [44.4770330, -73.1939628],
            [44.4767412, -73.1939174],
            [44.4767536, -73.1937446],
            [44.4770452, -73.1937908],

        ],
        config: {
            rotation: 0,
            gridCols: 3,
            padding: 0.3
        }
    },

    'MANN': {
        corners: [
            [44.4825224, -73.1937884],
            [44.4824129, -73.1937062],
            [44.4825802, -73.1933009],
            [44.4826772, -73.1933970],
            
        ],
        config: {
            rotation: 0,
            gridCols: 2,
            padding: 0.3
        }
    },

    '31 SPR': {
        corners: [
            [44.4798016, -73.2007702],
            [44.4797593, -73.2007683],
            [44.4797586, -73.2007232],
            [44.4798012, -73.2007223],
            
        ],
        config: {
            rotation: 0,
            gridCols: 2,
            padding: 0.3
        }
    },

    'MUSIC': {
        corners: [
            [44.4697162, -73.1979479],
            [44.4696408, -73.1979449],
            [44.4696445, -73.1977524],
            [44.4697163, -73.1977603],

        ],
        config: {
            rotation: 0,
            gridCols: 1,
            padding: 0.3
        }
    },
    'SOUTHW': {
        corners: [
            [44.4696110, -73.1980688],
            [44.4695153, -73.1980636],
            [44.4695161, -73.1974651],
            [44.4696143, -73.1974657],

        ],
        config: {
            rotation: 0,
            gridCols: 1,
            padding: 0.3
        }
    },
    'PATGYM': {
        corners: [
            [44.4703837, -73.1950082],
            [44.4701472, -73.1949591],
            [44.4701859, -73.1944862],
            [44.4704264, -73.1945326],
        ],
        config: {
            rotation: -6,
            gridCols: 3,
            padding: 0.3
        }
    },

    'POMERO': {
        corners: [
            [44.4759640, -73.1993598],
            [44.4759281, -73.1993554],
            [44.4759312, -73.1993293],
            [44.4759656, -73.1993300],

        ],
        config: {
            rotation: 0,
            gridCols: 2,
            padding: 0.3
        }
    },

    'UHTN': {
        corners: [
            [44.4729523, -73.1958147],
            [44.4728399, -73.1958111],
            [44.4728361, -73.1956019],
            [44.4729471, -73.1956153],

        ],
        config: {
            rotation: 0,
            gridCols: 2,
            padding: 0.3
        }
    },

    'UHTS23': {
        corners: [
            [44.4721624, -73.1956773],
            [44.4720556, -73.1956809],
            [44.4720579, -73.1955023],
            [44.4721678, -73.1955064],

        ],
        config: {
            rotation: 0,
            gridCols: 1,
            padding: 0.3
        }
    },
    'WHEELR': {
        corners: [
            [44.4768096, -73.2015600],
            [44.4767365, -73.2015586],
            [44.4767386, -73.2014617],
            [44.4768139, -73.2014631],

        ],
        config: {
            rotation: 0,
            gridCols: 1,
            padding: 0.3
        }
    },

};

