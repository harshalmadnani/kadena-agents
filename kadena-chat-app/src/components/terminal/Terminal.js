import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { createClient } from '@supabase/supabase-js';
import Navbar from '../Navbar';

const Container = styled.div`
  height: 100%;
  background-color: #000;
  color: #fff;
  font-family: monospace;
  padding: 20px;
  overflow-y: auto;
`;

const Line = styled.div`
  margin-bottom: 16px;
  white-space: pre-wrap;
`;

const Command = styled(Line)`
  color: #64ff64;
  &::before {
    content: '> ';
  }
`;

const Output = styled(Line)`
  color: #fff;
`;

const Timestamp = styled.span`
  color: #666;
  margin-left: 10px;
  font-size: 12px;
`;

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function Terminal({ selectedAgent = 38 }) {
  const [history, setHistory] = useState([]);
  const [agentNames, setAgentNames] = useState({});
  const terminalRef = useRef(null);

  useEffect(() => {
    fetchAgentNames();
    fetchMessages();
    const interval = setInterval(fetchCryptoNews, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [selectedAgent]);

  const fetchAgentNames = async () => {
    try {
      const { data, error } = await supabase
        .from('agents2')
        .select('id, name');
      
      if (error) throw error;
      
      const namesMap = {};
      data.forEach(agent => {
        namesMap[agent.id] = agent.name;
      });
      setAgentNames(namesMap);
    } catch (error) {
      console.error('Error fetching agent names:', error);
    }
  };

  const fetchCryptoNews = async () => {
    try {
      const options = {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.REACT_APP_PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "sonar",
          messages: [
            {
              role: "system",
              content: "You are Alphachad, a degenerate and fun assistant focused on crypto. Give one brief piece of recent crypto news or market update in a degen manner."
            },
            { 
              role: "user", 
              content: "Give me one piece of recent crypto news or market update." 
            }
          ]
        })
      };

      const response = await fetch('https://api.perplexity.ai/chat/completions', options);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to get AI response');
      }

      setHistory(prev => [...prev, {
        type: 'output',
        content: data.choices[0].message.content
      }]);

      if (terminalRef.current) {
        terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
      }
    } catch (error) {
      console.error('Error fetching crypto news:', error);
    }
  };

  const fetchMessages = async () => {
    if (!selectedAgent) return;

    const { data: agentsData, error: agentsError } = await supabase
      .from('terminal2')
      .select('agent_id, tweet_content, created_at')
      .eq('agent_id', selectedAgent)
      .order('created_at', { ascending: false });

    if (agentsError) {
      console.error('Error fetching messages:', agentsError);
      return;
    }

    if (agentsData) {
      const messages = agentsData.map(item => ({
        type: 'output',
        agentId: item.agent_id,
        content: item.tweet_content,
        timestamp: new Date(item.created_at)
      }));
      setHistory(messages);
    }
  };

  return (
    <>
      <Navbar />
      <Container ref={terminalRef}>
        {history.map((entry, index) => (
          <div key={index}>
            {entry.type === 'input' ? (
              <Command>{entry.content}</Command>
            ) : (
              <Output>
                <span style={{ color: '#64ff64' }}>
                  {entry.type === 'input' ? '> ' : `${agentNames[entry.agentId] || `Agent ${entry.agentId}`}: `}
                </span>
                {entry.content}
                {entry.timestamp && (
                  <Timestamp>{entry.timestamp.toLocaleString()}</Timestamp>
                )}
              </Output>
            )}
          </div>
        ))}
      </Container>
    </>
  );
}

export default Terminal;