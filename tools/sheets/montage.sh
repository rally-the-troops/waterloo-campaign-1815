function mon2() {
	TILE=$1
	shift
	OUT=$1
	shift
	LIST=
	while (( "$#" ))
	do
		LIST="$LIST a$1.png b$1.png"
		shift
	done
	montage -mode concatenate -tile $TILE $LIST $OUT
}

function mon1() {
	TILE=$1
	shift
	OUT=$1
	shift
	LIST=
	while (( "$#" ))
	do
		LIST="$LIST a$1.png"
		shift
	done
	montage -mode concatenate -tile $TILE $LIST $OUT
}

mon2 2x sheet_misc_1200.png 6 12 13 23

mon2 2x sheet_french1_1200.png 0 1 2 3 4 5 7 8 9 10 11
mon2 2x sheet_anglo1_1200.png 14 15 16 20 21 22
mon2 2x sheet_prussian1_1200.png 17 18 19 24 25 26

mon1 1x sheet_french2_1200.png 27 28 29 35 36 37
mon1 1x sheet_anglo2_1200.png 33 34 41 42
mon1 1x sheet_prussian2_1200.png 30 31 32 38 39 40

for F in sheet_*_1200.png
do
	OUT=$(echo $F | sed 's/_1200.png//')
	pngtopnm "$F" | pnmdepth 65535 | pnmgamma -ungamma -srgbramp | pnmscale 0.0625 | pnmgamma -srgbramp | pnmtopng > ${OUT}_75.png
	pngtopnm "$F" | pnmdepth 65535 | pnmgamma -ungamma -srgbramp | pnmscale 0.125 | pnmgamma -srgbramp | pnmtopng > ${OUT}_150.png
done
