import { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import DealCard from "./DealCard";
import { cn } from "@/lib/utils";

const stages = [
  { id: "prospecting", label: "Prospecting", color: "bg-slate-500" },
  { id: "loi", label: "LOI", color: "bg-indigo-500" },
  { id: "due_diligence", label: "Due Diligence", color: "bg-blue-500" },
  { id: "under_contract", label: "Under Contract", color: "bg-amber-500" },
  { id: "entitlements", label: "Entitlements", color: "bg-purple-500" },
  { id: "development", label: "Development", color: "bg-emerald-500" },
];

export default function DealPipeline({ deals, onUpdateDeal }) {
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    
    const { draggableId, destination } = result;
    const newStage = destination.droppableId;
    
    onUpdateDeal(draggableId, { stage: newStage });
  };

  const getDealsByStage = (stageId) => {
    return deals.filter(deal => deal.stage === stageId);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[600px]">
        {stages.map((stage) => {
          const stageDeals = getDealsByStage(stage.id);
          const totalValue = stageDeals.reduce((sum, d) => sum + (d.estimated_value || 0), 0);
          
          return (
            <div key={stage.id} className="flex-shrink-0 w-80">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", stage.color)} />
                  <h3 className="font-semibold text-slate-900">{stage.label}</h3>
                  <span className="text-sm text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {stageDeals.length}
                  </span>
                </div>
                {totalValue > 0 && (
                  <span className="text-xs text-slate-500">
                    ${(totalValue / 1000000).toFixed(1)}M
                  </span>
                )}
              </div>
              
              <Droppable droppableId={stage.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "space-y-3 min-h-[500px] p-2 rounded-xl transition-colors",
                      snapshot.isDraggingOver ? "bg-slate-100" : "bg-slate-50/50"
                    )}
                  >
                    {stageDeals.map((deal, index) => (
                      <Draggable key={deal.id} draggableId={deal.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={cn(
                              snapshot.isDragging && "opacity-90 rotate-2"
                            )}
                          >
                            <DealCard deal={deal} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                    {stageDeals.length === 0 && (
                      <div className="flex items-center justify-center h-32 text-sm text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                        Drop deals here
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}