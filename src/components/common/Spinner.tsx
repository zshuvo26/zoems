export default function Spinner({ size = 24 }: { size?: number }) {
  return (
    <div
      className="border-2 border-accent-blue border-t-transparent rounded-full animate-spin"
      style={{ width: size, height: size }}
    />
  )
}

export function FullPageSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner size={40} />
    </div>
  )
}
