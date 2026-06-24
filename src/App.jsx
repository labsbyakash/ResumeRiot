import { useState } from 'react';
// Import PDF.js worker to handle parsing
import * as pdfjs from 'pdfjs-dist';
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Initialize the Gemini Client (Make sure to set your API key)
import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

export default function App() {
  // Form States
  const [file, setFile] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [targetJob, setTargetJob] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  
  // App Workflow States
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);

  // Helper Function: Extract plain text from PDF
  const extractTextFromPdf = async (pdfFile) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const typedArray = new Uint8Array(e.target.result);
          
          // FIX: Wrap the typedArray in an object with the 'data' key
          const pdf = await pdfjs.getDocument({ data: typedArray }).promise;
          let fullText = '';
          
          // Loop through every page to compile text
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
          }
          
          resolve(fullText);
        } catch (error) {
          console.error("PDF.js error details:", error); // Added log to help you debug deep issues if any
          reject('Failed to parse PDF content.');
        }
      };

      reader.onerror = () => reject('File reading failed.');
      reader.readAsArrayBuffer(pdfFile);
    });
  };

  // Drag and Drop Handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf") {
        setFile(droppedFile);
      } else {
        alert("Please upload a PDF file only.");
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // Actual Gemini API Pipeline
  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!file || !targetJob || !experienceLevel) return;

    setIsLoading(true);
    setResults(null);

    try {
      // Step 1: Read the text content of the PDF
      const resumeText = await extractTextFromPdf(file);

      // Step 2: Call Gemini API using the new @google/genai SDK
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Target Role: ${targetJob}\nExperience Level: ${experienceLevel}\n\nResume Content:\n${resumeText}`,
        config: {
          // System instructions enforce the roast format and JSON structure
          systemInstruction: `You are a brutal, hilarious, and witty technical recruiter who roasts resumes. 
          Analyze the provided resume text against their target role. 
          You must respond ONLY with a valid JSON object matching this exact schema:
          {
            "matchScore": number (0-100),
            "targetRole": "string",
            "level": "string",
            "verdict": "A savage, funny, and deeply sarcastic 2-3 sentence overview roasting their choices or gaps.",
            "missingKeywords": ["3 funny or sarcastic roasts of missing technical skills/buzzwords"],
            "strengths": ["3 slightly backhanded compliments or genuine small victories found in the layout/text"]
          }`,
          responseMimeType: "application/json"
        }
      });

      // Step 3: Parse and display the response
      const jsonResponse = JSON.parse(response.text);
      setResults(jsonResponse);

    } catch (error) {
      console.error("Pipeline failure:", error);
      alert("Error processing your resume blueprint. Check console.");
    } finally {
      setIsLoading(false);
    }
  };

  // Reset Application State
  const handleReset = () => {
    setFile(null);
    setTargetJob('');
    setExperienceLevel('');
    setResults(null);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-100 font-['Outfit'] antialiased selection:bg-white selection:text-black flex flex-col justify-between">
      
      {/* HEADER */}
      <header className="border-b border-neutral-900 px-8 py-5 sticky top-0 bg-black/80 backdrop-blur-md z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="text-xl font-bold tracking-tight cursor-pointer flex items-center gap-1.5" onClick={handleReset}>
            <span>RESUME</span>
            <span className="text-neutral-400 font-light">RIOT</span>
          </div>
          <div className="hidden sm:flex space-x-8 text-xs font-medium tracking-widest text-neutral-400 uppercase">
            <span className="text-white border-b border-white pb-1 cursor-pointer">Scanner</span>
            <span className="hover:text-white transition-colors cursor-pointer">Engine</span>
            <span className="hover:text-white transition-colors cursor-pointer">Manifesto</span>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start grow w-full py-16">
        
        {/* INPUT PANEL (Left Side) */}
        <section className="lg:col-span-5 bg-[#0A0A0A] border border-neutral-900 rounded-xl p-8 shadow-2xl relative">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight text-white">Target Optimization</h2>
            <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wider">Upload Profile & Fine-tune Metrics</p>
          </div>

          <form onSubmit={handleAnalyze} className="space-y-6">
            
            {/* PDF Drag & Drop */}
            <div className="flex flex-col space-y-2">
              <label className="text-xs font-semibold tracking-wider text-neutral-400 uppercase">1. Document Intake</label>
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border border-dashed rounded-lg p-6 transition-all relative flex flex-col items-center justify-center text-center cursor-pointer min-h-35 ${
                  isDragActive 
                    ? 'border-white bg-neutral-900 text-white' 
                    : 'border-neutral-800 hover:border-neutral-500 bg-[#0E0E0E]'
                } ${file ? 'border-solid border-neutral-700 bg-neutral-900/40' : ''}`}
              >
                <input 
                  type="file" 
                  accept=".pdf" 
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
                  onChange={handleFileChange}
                  required={!file}
                />
                
                {file ? (
                  <div className="space-y-1">
                    <p className="font-medium text-sm text-neutral-200">✓ PDF Document Uploaded</p>
                    <p className="text-xs text-neutral-500 truncate max-w-60 mx-auto">{file.name}</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <p className="font-medium text-sm text-neutral-300">Drop resume file</p>
                    <p className="text-xs text-neutral-500">or click to browse local storage</p>
                  </div>
                )}
              </div>
            </div>

            {/* Target Role Input */}
            <div className="flex flex-col space-y-2">
              <label className="text-xs font-semibold tracking-wider text-neutral-400 uppercase">2. Target Destination Role</label>
              <input 
                type="text" 
                placeholder="e.g. Software Engineer, Product Manager" 
                value={targetJob}
                onChange={(e) => setTargetJob(e.target.value)}
                required
                className="w-full bg-[#0E0E0E] text-neutral-200 border border-neutral-800 rounded-lg p-3 text-sm placeholder-neutral-700 focus:outline-none focus:border-neutral-500 focus:bg-black transition-all"
              />
            </div>

            {/* Target Tier Selection */}
            <div className="flex flex-col space-y-2">
              <label className="text-xs font-semibold tracking-wider text-neutral-400 uppercase">3. Experience Matrix Level</label>
              <div className="grid grid-cols-3 gap-2.5">
                {['Level 1', 'Level 2', 'Level 3'].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setExperienceLevel(lvl)}
                    className={`border rounded-lg p-2.5 text-xs font-medium tracking-wide transition-all ${
                      experienceLevel === lvl 
                        ? 'bg-white text-black border-white' 
                        : 'border-neutral-800 text-neutral-400 bg-[#0E0E0E] hover:border-neutral-600 hover:text-white'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Trigger */}
            <button
              type="submit"
              disabled={isLoading || !file || !targetJob || !experienceLevel}
              className="w-full bg-white text-black hover:bg-neutral-200 rounded-lg p-3.5 font-semibold tracking-wide transition-all text-sm disabled:opacity-20 disabled:cursor-not-allowed flex justify-center items-center gap-2 mt-4"
            >
              {isLoading ? 'Processing Pipeline...' : 'Analyze Architecture'} 
            </button>
          </form>
        </section>

        {/* OUTPUT PANEL (Right Side) */}
        <section className="lg:col-span-7 bg-[#0A0A0A] border border-neutral-900 rounded-xl p-8 shadow-2xl min-h-[500px] flex flex-col justify-between">
          
          {/* STATE 1: INITIAL BLANK STATE */}
          {!isLoading && !results && (
            <div className="flex flex-col items-center justify-center my-auto text-center space-y-3 py-12">
              <div className="w-12 h-12 rounded-full border border-neutral-800 flex items-center justify-center text-neutral-600 text-lg">?</div>
              <div className="max-w-xs">
                <p className="text-sm font-medium text-neutral-300">Terminal Pipeline Standby</p>
                <p className="text-xs text-neutral-500 mt-1 leading-normal">Configure variables and launch scanning sequence to yield target structural reports.</p>
              </div>
            </div>
          )}

          {/* STATE 2: LOADING CORE */}
          {isLoading && (
            <div className="space-y-8 my-auto animate-pulse py-6">
              <div className="flex items-center justify-between border-b border-neutral-900 pb-5">
                <div className="h-6 bg-neutral-900 rounded-md w-1/3"></div>
                <div className="h-10 bg-neutral-900 rounded-full w-20"></div>
              </div>
              <div className="space-y-2.5">
                <div className="h-3.5 bg-neutral-900 rounded w-full"></div>
                <div className="h-3.5 bg-neutral-900 rounded w-11/12"></div>
                <div className="h-3.5 bg-neutral-900 rounded w-4/6"></div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="h-20 bg-neutral-900 rounded-lg"></div>
                <div className="h-20 bg-neutral-900 rounded-lg"></div>
              </div>
            </div>
          )}

          {/* STATE 3: PARSED RESULTS */}
          {!isLoading && results && (
            <div className="space-y-6 mt-2 animate-[fadeIn_0.2s_ease-out]">
              
              {/* Header Score Block */}
              <div className="flex flex-row justify-between items-center border-b border-neutral-900 pb-5 gap-4">
                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-white capitalize">{results.targetRole}</h3>
                  <p className="text-xs font-medium text-neutral-500 tracking-wider mt-0.5 uppercase">{results.level}</p>
                </div>
                <div className="bg-neutral-900/50 border border-neutral-800 rounded-full px-5 py-2.5 flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-neutral-400 tracking-widest uppercase">MATCH</span>
                  <span className="text-xl font-bold tracking-tight text-white">{results.matchScore}%</span>
                </div>
              </div>

              {/* Text Verdict */}
              <div className="bg-neutral-900/20 border border-neutral-900 rounded-lg p-4">
                <h4 className="text-[10px] font-semibold tracking-widest text-neutral-500 uppercase mb-1.5">Recruiter Breakdown</h4>
                <p className="text-sm font-normal text-neutral-300 leading-relaxed">{results.verdict}</p>
              </div>

              {/* Strengths & Weaknesses Split Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Vulnerabilities Box */}
                <div className="border border-neutral-900 bg-[#0E0E0E]/40 rounded-lg p-5">
                  <h5 className="text-[10px] font-semibold tracking-widest text-red-400 uppercase mb-3 block">
                    Discovered Gaps
                  </h5>
                  <ul className="space-y-2.5">
                    {results.missingKeywords.map((kw, idx) => (
                      <li key={idx} className="text-xs text-neutral-400 font-medium flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-800"></span> {kw}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Secure Vectors Box */}
                <div className="border border-neutral-900 bg-[#0E0E0E]/40 rounded-lg p-5">
                  <h5 className="text-[10px] font-semibold tracking-widest text-green-400 uppercase mb-3 block">
                    Small Mercies
                  </h5>
                  <ul className="space-y-2.5">
                    {results.strengths.map((st, idx) => (
                      <li key={idx} className="text-xs text-neutral-400 font-medium flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-800"></span> {st}
                      </li>
                    ))}
                  </ul>
                </div>

              </div>

              {/* Utility Clear Action */}
              <div className="pt-4 flex justify-end">
                <button 
                  onClick={handleReset} 
                  className="text-xs font-medium text-neutral-500 hover:text-white transition-colors underline underline-offset-4"
                >
                  Clear Results Matrix
                </button>
              </div>

            </div>
          )}

          {/* Footer build identifier */}
          <div className="border-t border-neutral-900 pt-4 mt-8 text-right text-[10px] text-neutral-600 font-mono tracking-widest">
            ENGINE STATUS // RR-V2.0.26
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-neutral-900 p-6 text-center text-xs text-neutral-600 tracking-widest uppercase">
        © 2026 RESUMERIOT. ALL RIGHTS RESERVED.
      </footer>

    </div>
  );
}