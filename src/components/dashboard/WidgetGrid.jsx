import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card } from "@/components/ui/card";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export default function WidgetGrid({ children, onReorder, isEditing = false }) {
  const handleDragEnd = (result) => {
    if (!onReorder) return;
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.index === destination.index) return;
    onReorder(draggableId, destination.index);
  };

  if (!isEditing) {
    return <div>{children}</div>;
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="dashboard-widgets" type="WIDGET">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn("space-y-4", snapshot.isDraggingOver && "bg-blue-50 rounded-lg")}
          >
            {children && Array.isArray(children) ? (
              children.map((child, index) => {
                const widgetId = child?.key || index.toString();
                return (
                  <Draggable key={widgetId} draggableId={widgetId} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={cn(
                          "transition-all",
                          snapshot.isDragging && "shadow-lg scale-105 z-50"
                        )}
                      >
                        <div className="relative group">
                          <div
                            {...provided.dragHandleProps}
                            className="absolute -left-8 top-4 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <GripVertical className="h-5 w-5 text-slate-400" />
                          </div>
                          {child}
                        </div>
                      </div>
                    )}
                  </Draggable>
                );
              })
            ) : (
              children
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}