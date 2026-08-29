export interface AtomicSnapshotReplacement<TTransaction, TRow, THistory> {
  rows: TRow[];
  historySamples: THistory[];
  transaction: <T>(
    work: (transaction: TTransaction) => Promise<T>,
  ) => Promise<T>;
  replaceCurrent: (transaction: TTransaction, rows: TRow[]) => Promise<void>;
  appendHistory: (
    transaction: TTransaction,
    samples: THistory[],
  ) => Promise<string[]>;
}

export async function commitGpuSnapshotAtomically<
  TTransaction,
  TRow,
  THistory,
>({
  rows,
  historySamples,
  transaction,
  replaceCurrent,
  appendHistory,
}: AtomicSnapshotReplacement<TTransaction, TRow, THistory>) {
  if (!rows.length) {
    throw new Error("Refusing to replace GPU pricing with an empty snapshot.");
  }

  return transaction(async (tx) => {
    await replaceCurrent(tx, rows);
    return appendHistory(tx, historySamples);
  });
}
