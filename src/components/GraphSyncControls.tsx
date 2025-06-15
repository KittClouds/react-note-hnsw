import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Database, CircleArrowRight, CircleCheck } from 'lucide-react';

interface GraphSyncControlsProps {
  syncService: any;
  getSyncStatus: () => any;
  validateSync: () => any;
  enableBidirectionalSync: (enabled: boolean) => void;
  setSyncDirection: (direction: 'localStorage-to-graph' | 'graph-to-localStorage' | 'bidirectional') => void;
  setConflictResolution: (strategy: { strategy: 'localStorage' | 'graph' | 'merge' | 'manual'; autoResolve: boolean }) => void;
  forceSync: () => void;
}

export function GraphSyncControls({
  syncService,
  getSyncStatus,
  validateSync,
  enableBidirectionalSync,
  setSyncDirection,
  setConflictResolution,
  forceSync
}: GraphSyncControlsProps) {
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [bidirectionalEnabled, setBidirectionalEnabled] = useState(false);
  const [syncDirection, setSyncDirectionState] = useState<string>('localStorage-to-graph');
  const [conflictStrategy, setConflictStrategy] = useState<string>('localStorage');

  useEffect(() => {
    if (getSyncStatus) {
      const status = getSyncStatus();
      setSyncStatus(status);
      setBidirectionalEnabled(status?.options?.enableBidirectionalSync || false);
      setSyncDirectionState(status?.options?.syncDirection || 'localStorage-to-graph');
    }
  }, [getSyncStatus]);

  const handleValidation = () => {
    if (validateSync) {
      const result = validateSync();
      setValidationResult(result);
    }
  };

  const handleBidirectionalToggle = (enabled: boolean) => {
    setBidirectionalEnabled(enabled);
    enableBidirectionalSync(enabled);
  };

  const handleSyncDirectionChange = (direction: string) => {
    setSyncDirectionState(direction);
    setSyncDirection(direction as any);
  };

  const handleConflictStrategyChange = (strategy: string) => {
    setConflictStrategy(strategy);
    setConflictResolution({
      strategy: strategy as any,
      autoResolve: true
    });
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Graph Sync Controls
          <Badge variant="secondary">Experimental</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sync Status */}
        <div className="space-y-2">
          <Label>Sync Status</Label>
          <div className="flex items-center gap-2">
            <Badge variant={syncStatus?.isEnabled ? 'default' : 'secondary'}>
              {syncStatus?.isEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Last sync: {syncStatus?.lastSyncTime || 'Never'}
            </span>
          </div>
        </div>

        {/* Sync Direction */}
        <div className="space-y-2">
          <Label>Sync Direction</Label>
          <Select value={syncDirection} onValueChange={handleSyncDirectionChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="localStorage-to-graph">localStorage → Graph</SelectItem>
              <SelectItem value="graph-to-localStorage">Graph → localStorage</SelectItem>
              <SelectItem value="bidirectional">Bidirectional</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bidirectional Sync Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label>Enable Bidirectional Sync</Label>
            <p className="text-sm text-muted-foreground">
              Allow graph changes to sync back to localStorage
            </p>
          </div>
          <Switch
            checked={bidirectionalEnabled}
            onCheckedChange={handleBidirectionalToggle}
          />
        </div>

        {/* Conflict Resolution */}
        <div className="space-y-2">
          <Label>Conflict Resolution Strategy</Label>
          <Select value={conflictStrategy} onValueChange={handleConflictStrategyChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="localStorage">Prefer localStorage</SelectItem>
              <SelectItem value="graph">Prefer Graph</SelectItem>
              <SelectItem value="merge">Attempt Merge</SelectItem>
              <SelectItem value="manual">Manual Resolution</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={forceSync} variant="outline">
            <CircleArrowRight className="h-4 w-4 mr-2" />
            Force Sync
          </Button>
          <Button onClick={handleValidation} variant="outline">
            <CircleCheck className="h-4 w-4 mr-2" />
            Validate Sync
          </Button>
        </div>

        {/* Validation Results */}
        {validationResult && (
          <div className="space-y-2">
            <Label>Validation Result</Label>
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={validationResult.isValid ? 'default' : 'destructive'}>
                  {validationResult.isValid ? 'Valid' : 'Invalid'}
                </Badge>
              </div>
              <div className="text-sm space-y-1">
                <div>localStorage: {validationResult.localStorage?.noteCount} notes, {validationResult.localStorage?.nestCount} nests</div>
                <div>Graph: {validationResult.graph?.nodeCount} nodes, {validationResult.graph?.edgeCount} edges</div>
                {validationResult.mismatches?.length > 0 && (
                  <div className="mt-2">
                    <div className="font-medium">Mismatches:</div>
                    {validationResult.mismatches.map((mismatch: string, index: number) => (
                      <div key={index} className="text-red-600 text-xs">{mismatch}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
