type StatusMessageProps = {
  status: "success" | "error";
  message: string;
};

export function StatusMessage({ status, message }: StatusMessageProps) {
  return (
    <p
      className={`rounded-md border px-3 py-2 text-sm ${
        status === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
      role="status"
    >
      {message}
    </p>
  );
}
