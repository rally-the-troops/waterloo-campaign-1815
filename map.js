"use strict"

// vim:set nowrap:

const map = {
	roads: [[1007,1006,1105,1104,1204],[1007,1107,1207],[1012,1112],[1012,1111],[1018,1019,1020],[1018,1117],[1022,1023],[1022,1121],[1023,1024],[1100,1000],[1100,1201],[1109,1009],[1109,1110,1111],[1109,1209],[1111,1011],[1111,1112],[1111,1211,1311,1411,1511],[1112,1113,1214,1314],[1117,1017],[1117,1116,1216,1215],[1118,1119,1220],[1118,1219,1318],[1118,1218,1217],[1121,1221],[1129,1029],[1129,1128,1127,1027,1026,1126,1226,1227,1327],[1129,1130],[1130,1030],[1130,1031,1131],[1130,1231],[1131,1032,1033,1034,1134],[1131,1232,1233,1332,1333],[1131,1231],[1134,1035,1135],[1135,1036],[1135,1235,1335,1435,1434],[1201,1200],[1201,1202,1302],[1201,1301],[1204,1203,1302],[1204,1304],[1207,1206,1305,1304],[1207,1208,1209],[1209,1309,1410],[1215,1115,1015],[1215,1314],[1217,1317],[1217,1316],[1220,1221],[1220,1319],[1221,1321,1422,1423,1522,1622],[1231,1330,1430,1529,1528,1428,1327],[1301,1302],[1301,1402,1403,1503],[1301,1401],[1302,1303,1404,1405],[1304,1405],[1314,1315,1316],[1314,1415,1416],[1314,1414,1514],[1316,1416],[1317,1318],[1317,1417],[1318,1319],[1318,1419],[1319,1419],[1327,1427,1526],[1333,1434],[1333,1433],[1340,1339,1239],[1340,1341,1441,1440],[1340,1440],[1401,1400],[1401,1500,1601],[1405,1406,1407],[1405,1505,1506],[1407,1408],[1407,1506],[1408,1409,1410],[1408,1508,1609,1708],[1416,1417],[1416,1516],[1417,1418,1419],[1417,1516],[1419,1420,1520],[1419,1518],[1434,1534,1635,1636,1736,1737],[1440,1539,1639,1738,1737],[1506,1607],[1511,1612],[1514,1513,1512,1612],[1514,1515,1516],[1514,1614,1713],[1516,1517,1518],[1516,1617,1716],[1518,1618],[1520,1521,1622],[1520,1621,1721],[1601,1602,1603],[1601,1701,1802],[1607,1608,1708],[1607,1707,1807,1906],[1612,1613,1713],[1612,1711,1812],[1618,1619,1719,1720],[1618,1717],[1622,1623],[1622,1721],[1623,1723,1724,1725],[1623,1722,1823,1922],[1708,1709],[1708,1809,1908],[1709,1610],[1709,1710,1811,1812],[1709,1810,1909],[1713,1714,1815,1915],[1713,1813],[1716,1717],[1716,1817,1917],[1717,1718,1819,1820],[1720,1721],[1720,1821],[1720,1820],[1721,1822,1922],[1725,1726,1727,1728],[1725,1825,1925],[1728,1729,1830],[1728,1828,1927],[1737,1838],[1737,1837,1836],[1801,1800],[1801,1802],[1801,1901,2001],[1802,1803,1903],[1806,1705,1605],[1806,1906],[1806,1905],[1812,1813],[1812,1911],[1813,1913,1914],[1813,1912,1911],[1820,1821],[1820,1919],[1821,1921,1922],[1830,1730,1631,1731,1732,1833],[1830,1831,1931],[1830,1929],[1833,1834,1835,1836],[1833,1932],[1836,1935,2035],[1838,1938,1939,2039,2139,2240,2339],[1838,1937,2037,2136,2236],[1903,1904,1905],[1903,2003,2103,2203],[1905,1805,1704],[1905,1906],[1906,1907,1908],[1906,2007,2107,2208,2308],[1908,1909],[1908,2009,2109,2210,2309,2410,2509],[1909,1910,1911],[1914,1915],[1914,2015],[1915,1916,1917],[1915,2015],[1917,1918,1919],[1917,2018],[1919,1920,2021,2121,2222],[1919,2019],[1922,1923,1924,1925],[1922,2023,2122],[1925,1926,1927],[1925,2026],[1927,1928,1929],[1927,2027],[1929,2030],[1931,1932],[1931,2031,2030],[1932,2033],[2001,2000],[2001,2101,2202,2203],[2001,2100,2200,2300,2400,2500],[2015,2016,2017,2117],[2015,2114,2215,2314,2414,2513,2613],[2018,2019],[2018,2117],[2019,2119,2219],[2026,2027],[2026,2125,2225],[2027,2127,2228],[2030,2129],[2035,2135,2236],[2117,2118,2219],[2117,2218,2317],[2122,2123,2224,2225],[2122,2222],[2129,2128,2228],[2129,2230,2329],[2133,2234,2333,2434,2534],[2133,2233,2332,2432,2431],[2203,2303,2404],[2203,2302,2403,2502],[2219,2220,2320,2321],[2219,2319,2420,2519],[2222,2223],[2222,2322],[2222,2321],[2223,2323],[2223,2322],[2225,2226],[2225,2324],[2226,2227,2228],[2226,2326,2427],[2236,2237,2337],[2236,2336],[2307,2308],[2307,2407,2406,2405],[2308,2409,2509],[2317,2316,2315,2415,2514,2615,2714],[2317,2418],[2321,2322],[2321,2421],[2322,2323],[2322,2423],[2322,2422,2421],[2323,2324],[2324,2325,2425],[2329,2328,2327,2427],[2329,2430],[2336,2337],[2336,2436],[2337,2438],[2339,2340,2441,2541],[2339,2440],[2404,2405],[2404,2504],[2405,2504],[2418,2518,2619],[2418,2517,2618],[2421,2521,2522],[2421,2520,2519],[2423,2424,2425],[2423,2522],[2425,2525,2526],[2427,2527,2628],[2430,2431],[2430,2530],[2430,2529],[2431,2530],[2436,2536],[2436,2535,2534],[2437,2438],[2437,2537,2638,2639,2739,2840],[2437,2536],[2438,2439,2440],[2440,2539,2640],[2500,2501,2502],[2500,2601],[2502,2503],[2502,2603,2702],[2503,2504],[2503,2604],[2509,2610],[2519,2620,2621,2721],[2519,2619],[2522,2623,2723],[2526,2627,2628],[2526,2626],[2529,2530],[2529,2630,2730],[2530,2531,2632,2633,2733],[2534,2635],[2534,2634,2733],[2536,2636],[2601,2701],[2601,2700],[2604,2605],[2604,2704],[2605,2606,2607,2608,2609],[2605,2705,2805,2806,2906,3007],[2605,2704],[2609,2610],[2609,2708,2809,2810],[2610,2710],[2613,2713,2714],[2613,2712,2812,2911],[2618,2619],[2619,2719,2720,2721],[2626,2726,2827],[2626,2725,2825],[2628,2728,2729],[2635,2636],[2635,2735,2836],[2636,2736,2836],[2640,2740,2840],[2701,2702],[2701,2802],[2702,2703,2704],[2702,2803,2903,3004],[2702,2802],[2710,2811,2911],[2710,2810],[2714,2715],[2715,2716],[2715,2815,2814,2913],[2721,2722,2823,2723],[2723,2724,2825],[2729,2830,2930],[2729,2829],[2730,2731,2732,2733],[2730,2831],[2733,2834,2835,2935],[2733,2833,2932],[2802,2902],[2810,2909],[2818,2819,2919,3020,3120],[2818,2917,3018],[2825,2826,2827],[2825,2925,3026,3125],[2827,2828],[2828,2829],[2829,2928],[2831,2832,2932],[2831,2930],[2836,2935],[2840,2940,3040,3140],[2840,2939,3039],[2902,2901,2801,2800],[2902,3002],[2909,2910,2911],[2909,3009,3008],[2911,2912,2913],[2911,3012],[2911,3011,3111,3211,3311],[2913,2914,2915,2916,3017],[2928,3028],[2930,2931,2932],[2930,3030],[2932,2933,2934,3035],[2932,3033,3133,3234],[2935,2936,2937,3038],[2935,3036],[3001,3000],[3001,3002],[3001,3101,3202],[3001,3100,3200],[3002,3003],[3002,3102,3203],[3003,3004],[3003,3103],[3004,3005,3006,3007],[3007,3008],[3007,3106,3107,3208],[3008,3108,3208],[3012,3013,3113,3114,3215,3216],[3012,3112,3213,3313],[3017,3018],[3017,3117],[3018,3019,3119,3120],[3018,3117],[3028,3127],[3030,3031,3130,3231],[3030,3129],[3035,3036],[3035,3135],[3036,3037],[3037,3038],[3037,3137,3138],[3037,3136,3135],[3038,3039],[3039,3138],[3103,3204,3304],[3103,3203],[3117,3116,3216],[3120,3121,3022,3122,3123,3024,3124,3125],[3125,3126,3127],[3125,3226,3326],[3127,3227,3326],[3129,3230,3231],[3129,3229,3228],[3135,3134,3234],[3135,3236,3237,3337],[3138,3139,3140],[3138,3238,3337],[3140,3241],[3140,3240,3339],[3202,3203],[3202,3302],[3202,3301],[3203,3303],[3208,3308,3408],[3216,3316],[3228,3328,3428],[3228,3327],[3231,3232,3233,3333],[3231,3331,3432,3532],[3234,3334,3435,3436],[3234,3333],[3301,3300],[3301,3302],[3301,3402],[3302,3303],[3302,3402],[3303,3304],[3303,3404],[3304,3305,3206,3306,3407,3408],[3304,3405,3505],[3311,3412],[3311,3411],[3313,3414,3514,3615],[3313,3413],[3316,3417,3418,3419,3319,3320,3321,3422,3423,3523,3524,3525,3526],[3316,3416,3515],[3326,3327],[3326,3426,3526],[3327,3428],[3333,3434,3433,3532],[3337,3336,3436],[3337,3338],[3338,3339],[3338,3438],[3339,3440,3540],[3339,3439,3539],[3402,3502,3603],[3402,3501,3602,3701,3801],[3404,3504,3605],[3404,3503,3603],[3408,3507,3608],[3411,3410],[3411,3511,3512],[3411,3510,3509],[3412,3413],[3412,3512],[3413,3513,3614],[3428,3528,3628,3728],[3436,3535],[3505,3606,3607,3608],[3505,3605],[3509,3609,3708],[3512,3613],[3515,3516,3617,3717,3718],[3515,3616],[3526,3626,3725],[3532,3531,3631,3630,3729],[3532,3633],[3535,3636],[3535,3635],[3539,3540],[3539,3640,3740,3841],[3540,3441],[3540,3541],[3603,3703,3804],[3605,3705],[3608,3708],[3613,3614],[3613,3713],[3614,3615],[3614,3713],[3615,3616],[3615,3715],[3616,3715],[3633,3634,3635],[3633,3732,3731],[3635,3636],[3635,3734,3834,3933,4034,3934,3935],[3636,3736,3836,3935],[3705,3704,3804],[3705,3805,3905],[3708,3709,3710,3711],[3708,3808],[3711,3812,3813],[3711,3811,3911,4012],[3713,3712,3813],[3713,3814],[3715,3714,3814],[3715,3816,3817,3917],[3715,3815,3915],[3718,3819],[3718,3818],[3722,3721,3720,3719,3819],[3722,3723],[3722,3822,3921,4022],[3723,3724,3825,3925],[3723,3824,3924,3925],[3728,3729],[3728,3828],[3729,3730,3731],[3729,3829],[3731,3832,3932,4032],[3801,3700],[3801,3802],[3802,3803,3903],[3802,3901,3900],[3804,3903],[3808,3908,4008],[3808,3907,3906,4006],[3813,3814],[3814,3914,3915],[3814,3913,4014],[3818,3917],[3819,3919],[3828,3827],[3828,3829],[3828,3927,4028],[3829,3929,4029],[3841,3840,3939,3938,4038,4037,3936,3935],[3841,3940,4041],[3900,4001],[3900,4000],[3903,3904,4005],[3903,4003,4002],[3905,4006],[3905,4005],[3915,4015],[3917,4018,4019,3919],[3917,4017,4016],[3919,4020],[3925,4026],[3925,4025],[3935,4036],[4005,4006]],
	rivers: [[1012,1013],[1013,1113],[1013,1112],[1014,1113],[1018,1118],[1019,1119],[1019,1118],[1020,1119],[1038,1039],[1039,1138],[1113,1114],[1114,1214],[1116,1217],[1117,1118],[1117,1218],[1117,1217],[1119,1120],[1120,1221],[1120,1220],[1121,1221],[1138,1139],[1138,1239],[1214,1215],[1215,1315],[1215,1314],[1216,1217],[1216,1316],[1216,1315],[1221,1222],[1222,1322],[1222,1321],[1223,1323],[1223,1322],[1238,1239],[1238,1338],[1323,1324],[1323,1424],[1324,1425],[1325,1425],[1337,1338],[1337,1438],[1423,1424],[1423,1523],[1424,1425],[1424,1524],[1425,1426],[1426,1525],[1427,1527],[1428,1527],[1430,1530],[1431,1530],[1432,1532],[1433,1532],[1437,1438],[1437,1537],[1522,1523],[1523,1524],[1523,1624],[1523,1623],[1525,1526],[1525,1626],[1526,1527],[1526,1627],[1527,1528],[1528,1629],[1528,1628],[1529,1530],[1529,1629],[1530,1531],[1530,1630],[1531,1532],[1531,1632],[1531,1631],[1532,1533],[1533,1634],[1533,1633],[1534,1634],[1536,1537],[1537,1637],[1625,1626],[1626,1627],[1626,1726],[1626,1725],[1628,1629],[1629,1630],[1630,1631],[1630,1730],[1630,1729],[1634,1635],[1635,1735],[1635,1734],[1636,1735],[1637,1638],[1637,1737],[1638,1737],[1735,1736],[1736,1737],[1736,1837],[1736,1836],[1737,1738],[1738,1839],[1738,1838],[1739,1840],[1739,1839],[1740,1840],[1840,1841],[1841,1941],[1841,1940]],
	towns: [1015,1018,1021,1024,1026,1100,1117,1118,1129,1201,1204,1209,1211,1215,1217,1221,1239,1340,1401,1407,1423,1433,1516,1526,1528,1534,1601,1603,1605,1623,1631,1716,1728,1737,1800,1810,1821,1825,1830,1903,1911,1915,1916,1919,1922,1928,1932,2001,2027,2035,2119,2122,2123,2219,2222,2223,2230,2308,2315,2317,2324,2327,2333,2337,2404,2500,2521,2529,2537,2604,2609,2618,2623,2715,2721,2723,2725,2730,2733,2736,2739,2827,2829,2840,2911,2936,3002,3013,3018,3020,3031,3125,3129,3135,3138,3204,3206,3226,3231,3233,3234,3240,3313,3327,3328,3402,3408,3417,3418,3438,3441,3512,3514,3523,3528,3614,3616,3617,3631,3636,3705,3708,3715,3718,3719,3723,3803,3828,3832,3915,3919,3925,3933,4006,4038],
	streams: [1124,1224,1300,1324,1501,1502,1600,2038,2138,2507,2524,2540,2624,2625,2637,2641,2718,2737,2741,2808,2817,2820,2821,2838,2905,2907,2920,2921,2938,3021,3025,3041,3118,3141,3205,3207,3219,3220,3221,3222,3223,3225,3323,3324,3325,3406,3506,3517,3518,3520,3521,3534,3536,3604,3619,3622,3623,3624,3637,3706,3707,3735,3739,3806,3820,3837,3920,3937,4007,4021,4027,4039],
	all_streams: [1021,1024,1120,1124,1224,1300,1314,1324,1401,1415,1501,1502,1514,1600,1601,1603,1604,1704,1837,1937,2038,2138,2407,2507,2524,2540,2604,2608,2609,2620,2621,2624,2625,2637,2641,2704,2708,2718,2719,2721,2724,2725,2737,2740,2741,2805,2808,2817,2820,2821,2825,2838,2840,2905,2906,2907,2915,2916,2917,2920,2921,2925,2938,2940,3006,3017,3018,3019,3020,3021,3022,3025,3039,3040,3041,3106,3117,3118,3121,3122,3125,3141,3205,3207,3219,3220,3221,3222,3223,3225,3226,3305,3306,3320,3323,3324,3325,3406,3423,3502,3503,3506,3517,3518,3520,3521,3523,3534,3535,3536,3604,3605,3606,3607,3619,3622,3623,3624,3635,3637,3703,3704,3705,3706,3707,3708,3709,3710,3711,3712,3713,3714,3719,3723,3735,3736,3739,3802,3803,3806,3813,3820,3824,3825,3836,3837,3840,3906,3920,3925,3937,3938,3939,4007,4021,4026,4027,4038,4039]
}

if (typeof module !== "undefined")
	module.exports = map
