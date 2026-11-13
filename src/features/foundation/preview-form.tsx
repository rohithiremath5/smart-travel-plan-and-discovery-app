import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const labelSchema = z.object({
  label: z
    .string()
    .trim()
    .min(2, 'Use at least 2 characters.')
    .max(40, 'Use 40 characters or fewer.'),
});
type LabelValues = z.infer<typeof labelSchema>;
const defaultLabel = 'A considered journey';

export function PreviewForm() {
  const [appliedLabel, setAppliedLabel] = useState(defaultLabel);
  const [updated, setUpdated] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LabelValues>({
    resolver: zodResolver(labelSchema),
    defaultValues: { label: defaultLabel },
  });
  return (
    <form
      onSubmit={handleSubmit((values) => {
        setAppliedLabel(values.label);
        setUpdated(true);
      })}
      noValidate
      className="preview-form"
    >
      <label htmlFor="preview-label" className="field-label">
        Preview label
      </label>
      <Input
        id="preview-label"
        {...register('label')}
        aria-invalid={Boolean(errors.label)}
        aria-describedby={`label-hint${errors.label ? ' label-error' : ''}`}
        autoComplete="off"
      />
      <p id="label-hint" className="field-hint">
        2–40 characters. Changes this sample only; nothing is saved.
      </p>
      {errors.label && (
        <p id="label-error" className="field-error" role="alert">
          {errors.label.message}
        </p>
      )}
      <div className="form-actions">
        <Button type="submit">
          Update sample <Check aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            reset();
            setAppliedLabel(defaultLabel);
            setUpdated(false);
          }}
          aria-label="Reset sample"
        >
          <RotateCcw aria-hidden="true" /> Reset
        </Button>
      </div>
      <div className="label-preview">
        <span className="eyebrow">YOUR COMPONENT PREVIEW</span>
        <p>{appliedLabel}</p>
      </div>
      <p className="form-status" role="status">
        {updated ? 'Sample updated for this page only.' : ''}
      </p>
    </form>
  );
}
