export function serverActionWrapperRESPONSE<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends (...args: any[]) => Promise<any>,
>(serverAction: T, blankData: Awaited<ReturnType<T>>, errorMsg?: string) {
  // Returns a function that takes the same props as the original action
  return async function wrapper(...props: Parameters<T>): Promise<{
    success: boolean;
    data: Awaited<ReturnType<T>>;
    error?: string;
  }> {
    try {
      // Forward all props to the original server action
      const data = await serverAction(...props);
      return { data, success: true };
    } catch (err) {
      console.log(errorMsg);

      // Use provided custom message or the caught error's message
      return {
        data: blankData,
        success: false,
        error: (err instanceof Error ? err.message : String(err)) || errorMsg,
      };
    }
  };
}
