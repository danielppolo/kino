type SubmitResult<T> = {
  error?: string;
  resetValues?: T;
  setFocus?: string;
};

interface RunEntityFormSubmitOptions<T> {
  values: T;
  addAnother?: boolean;
  onBeforeErrorReopen?: (values: T) => void;
  onOpenChange?: (open: boolean) => void;
  onSubmit: (values: T) => Promise<SubmitResult<T>>;
}

export async function runEntityFormSubmit<T>({
  values,
  addAnother,
  onBeforeErrorReopen,
  onOpenChange,
  onSubmit,
}: RunEntityFormSubmitOptions<T>) {
  if (!addAnother) {
    onOpenChange?.(false);
  }

  const result = await onSubmit(values);

  if (result.error && !addAnother) {
    onBeforeErrorReopen?.(values);
    onOpenChange?.(true);
  }

  return result;
}
