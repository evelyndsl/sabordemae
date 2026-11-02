import { Check } from 'lucide-react'

// Mensagem de erro ou de sucesso exibida ao lado do botão de salvar.
export function FormStatus({ error, saved }: { error?: string; saved?: boolean }) {
  if (error) return <p role="alert" className="alert alert--error">{error}</p>
  if (saved) {
    return (
      <p role="status" className="form-saved">
        <Check className="size-4" /> Salvo!
      </p>
    )
  }
  return null
}
