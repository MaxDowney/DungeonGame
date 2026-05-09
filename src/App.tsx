import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Bug, Save, Settings } from "lucide-react";
import { useEffect } from "react";
import { CampaignScreen } from "./components/Screens/CampaignScreen";
import { DMLoadoutScreen } from "./components/Screens/DMLoadoutScreen";
import { HeroLoadoutScreen } from "./components/Screens/HeroLoadoutScreen";
import { MapEditorScreen } from "./components/Screens/MapEditorScreen";
import { ResolutionScreen } from "./components/Screens/ResolutionScreen";
import { TacticalScreen } from "./components/Screens/TacticalScreen";
import { TitleScreen } from "./components/Screens/TitleScreen";
import { GlobalTooltip } from "./components/GlobalTooltip";
import { RulebookOverlay } from "./components/RulebookOverlay";
import { useGameStore } from "./game/state/store";

const screenVariants = {
  initial: { opacity: 0, scale: 0.985, filter: "blur(6px)" },
  animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
  exit: { opacity: 0, scale: 1.01, filter: "blur(4px)" },
};

export function App() {
  const screen = useGameStore((state) => state.screen);
  const helpOpen = useGameStore((state) => state.helpOpen);
  const toggleHelp = useGameStore((state) => state.toggleHelp);
  const toggleDebug = useGameStore((state) => state.toggleDebug);
  const saveGame = useGameStore((state) => state.saveGame);
  const syncDataDefinitions = useGameStore((state) => state.syncDataDefinitions);

  useEffect(() => {
    syncDataDefinitions();
  }, [syncDataDefinitions]);

  const renderScreen = () => {
    switch (screen) {
      case "campaign":
        return <CampaignScreen />;
      case "heroLoadout":
        return <HeroLoadoutScreen />;
      case "dmLoadout":
        return <DMLoadoutScreen />;
      case "mapEditor":
        return <MapEditorScreen />;
      case "tactical":
        return <TacticalScreen />;
      case "resolution":
        return <ResolutionScreen />;
      default:
        return <TitleScreen />;
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-obsidian text-stone-100">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_30%_10%,rgba(183,131,59,.22),transparent_32%),radial-gradient(circle_at_82%_18%,rgba(139,28,49,.2),transparent_30%),linear-gradient(180deg,#151217,#09080b)]" />
      <div className="fixed inset-0 opacity-30 mix-blend-screen fantasy-noise" />
      <div className="fixed right-4 top-4 z-50 flex gap-2">
        <button className="icon-button" title="Save game" data-tooltip="Save the current campaign and tactical state to this browser." onClick={saveGame}>
          <Save size={18} />
        </button>
        <button className="icon-button" title="Rulebook" data-tooltip="Open the quick rulebook: AP, Pressure, Doom, campaign rewards, and keywords." onClick={toggleHelp}>
          <BookOpen size={18} />
        </button>
        <button className="icon-button" title="Toggle debug tools" data-tooltip="Show or hide developer test controls for fast prototype iteration." onClick={toggleDebug}>
          <Bug size={18} />
        </button>
        <button className="icon-button" title="Settings" data-tooltip="Settings placeholder for future audio, animation, and accessibility options.">
          <Settings size={18} />
        </button>
      </div>
      <main className="relative z-10 h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            variants={screenVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.32, ease: "easeOut" }}
            className="h-full"
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </main>
      <AnimatePresence>{helpOpen && <RulebookOverlay />}</AnimatePresence>
      <GlobalTooltip />
    </div>
  );
}
