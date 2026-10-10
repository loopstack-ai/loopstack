import { Info, Loader2, Plus } from 'lucide-react';
import { useMemo } from 'react';
import type { EnvironmentConfigInterface } from '@loopstack/contracts/api';
import { Button } from '../../../components/ui/button.tsx';
import { Label } from '../../../components/ui/label.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select.tsx';

export interface EnvironmentOption {
  id: string;
  type: string;
  name: string;
  local?: boolean;
}

interface EnvironmentSlotSelectorProps {
  slot: EnvironmentConfigInterface;
  environments: EnvironmentOption[];
  selectedEnvironmentId: string | undefined;
  onSelect: (environmentId: string) => void;
  onCreateEnvironment?: () => void;
  isCreating?: boolean;
  error?: string;
}

export function EnvironmentSlotSelector({
  slot,
  environments,
  selectedEnvironmentId,
  onSelect,
  onCreateEnvironment,
  isCreating,
  error,
}: EnvironmentSlotSelectorProps) {
  const matchingEnvs = useMemo(
    () =>
      environments.filter((env) => {
        if (!slot.type) return true;
        return env.type === slot.type;
      }),
    [environments, slot.type],
  );

  const hasMatches = matchingEnvs.length > 0;

  return (
    <div className="space-y-2">
      <Label>
        {slot.title ?? slot.id}
        {slot.optional && <span className="text-muted-foreground ml-1 font-normal">(optional)</span>}
      </Label>

      {hasMatches ? (
        <Select value={selectedEnvironmentId} onValueChange={onSelect}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select an environment" />
          </SelectTrigger>
          <SelectContent>
            {slot.optional && (
              <SelectItem value="__none__">
                <span className="text-muted-foreground">None</span>
              </SelectItem>
            )}
            {matchingEnvs.map((env) => (
              <SelectItem key={env.id} value={env.id}>
                <span className="flex items-center gap-2">
                  {env.name}
                  {env.local && (
                    <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px] font-medium">
                      Local
                    </span>
                  )}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <div
          className={`flex items-center gap-3 rounded-md border border-dashed bg-background p-3 ${error ? 'border-destructive' : ''}`}
        >
          <Info className={`h-4 w-4 shrink-0 ${error ? 'text-destructive' : 'text-muted-foreground'}`} />
          <p className={`text-sm flex-1 ${error ? 'text-destructive' : 'text-muted-foreground'}`}>
            No matching environment available.
          </p>
          {onCreateEnvironment && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isCreating}
              onClick={() => onCreateEnvironment()}
            >
              {isCreating ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="mr-1.5 h-3.5 w-3.5" />
              )}
              Create
            </Button>
          )}
        </div>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
