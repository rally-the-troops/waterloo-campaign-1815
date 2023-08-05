# layer 1 (on): TIF file
# layer 2 (on): City & Def hexes
# layer 3 (on): Stream & River outlines
# layer 4 (on): Streams
# layer 5 (on): Rivers
# layer 6 (on): Roads
# layer 7 (on): Village art
# layer 8 (on): Text outlines
# layer 9 (on): Other Text
# layer 10 (on): Town Names
# layer 11 (on): City Names
# layer 12 (on): Hex Grid
# layer 13 (on): Hex Num
# layer 14 (on): Mask
# layer 15 (on): Mask text/charts
# layer 16 (on): Reinf codes

mutool draw -bArtBox -o map300.png -r300 -z8 -z9 -z10 -z11 -z13 "HIRES/WaterlooCampaignMap_FINAL_cs5 copy.pdf"
