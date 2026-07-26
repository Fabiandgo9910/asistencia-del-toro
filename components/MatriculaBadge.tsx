export default function MatriculaBadge({ matricula }: { matricula: string }) {
  return (
    <span className="plate tabular" aria-label={`Matrícula ${matricula}`}>
      <span className="plate__eu">E</span>
      <span className="plate__num">{matricula}</span>
    </span>
  );
}
