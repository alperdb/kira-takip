'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Btn } from './ui/base';
import { Modal, ModalBody, ModalFooter } from './ui/modal';
import { Field, Select, FormAlert } from './ui/form';
import { toast } from './ui/Toast';

export interface Field {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface Props {
  endpoint: string;
  fields: Field[];
  title: string;
  label?: string;
}

export default function AddForm({ endpoint, fields, title, label = 'Yeni Ekle' }: Props) {
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const router                = useRouter();

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const form = e.currentTarget;
    const data: Record<string, string> = {};
    fields.forEach(f => {
      const el = form.elements.namedItem(f.name) as HTMLInputElement | HTMLSelectElement;
      if (el?.value !== '') data[f.name] = el.value;
    });

    try {
      const res  = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Bir hata oluştu');
      toast.success('Kayıt başarıyla oluşturuldu');
      setOpen(false);
      form.reset();
      router.refresh();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setOpen(false);
    setError('');
  }

  return (
    <>
      <Btn onClick={() => setOpen(true)}>
        <Plus size={14} /> {label}
      </Btn>

      <Modal open={open} onClose={handleClose} title={title}>
        <form onSubmit={handleSubmit}>
          <ModalBody>
            {fields.map(f => (
              <Field key={f.name} label={f.label} required={f.required}>
                {f.options ? (
                  <Select name={f.name} required={f.required}>
                    <option value="">Seçin...</option>
                    {f.options.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </Select>
                ) : (
                  <input
                    name={f.name}
                    type={f.type ?? 'text'}
                    required={f.required}
                    placeholder={f.placeholder}
                  />
                )}
              </Field>
            ))}
            {error && <FormAlert>{error}</FormAlert>}
          </ModalBody>
          <ModalFooter>
            <Btn variant="ghost" onClick={handleClose}>İptal</Btn>
            <Btn type="submit" disabled={loading}>{loading ? 'Kaydediliyor...' : 'Kaydet'}</Btn>
          </ModalFooter>
        </form>
      </Modal>
    </>
  );
}
