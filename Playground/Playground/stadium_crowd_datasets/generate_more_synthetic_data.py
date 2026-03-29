from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd

from build_datasets import build_synthetic_gate_arrivals


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate more synthetic stadium gate arrival data.")
    parser.add_argument(
        "--matches",
        type=int,
        default=120,
        help="Number of synthetic matches to generate. Default is 120.",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="synthetic_gate_arrivals_extra.csv",
        help="Output CSV file name relative to the dataset folder.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.matches < 100:
        raise ValueError("Use --matches 100 or higher to satisfy the expansion target.")

    df = build_synthetic_gate_arrivals(n_matches=args.matches)
    output_path = Path(__file__).resolve().parent / args.output
    df.to_csv(output_path, index=False)

    print(f"Generated {df['match_id'].nunique()} matches")
    print(f"Gates: {df['gate_id'].nunique()}")
    print(f"Rows: {len(df)}")
    print(f"Saved to: {output_path}")


if __name__ == "__main__":
    main()
